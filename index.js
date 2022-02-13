import * as THREE from 'three';
// import easing from './easing.js';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useActivate, useLocalPlayer, useCameraManager, useLoaders, usePhysics, useParticleSystem, addTrackedApp, useDefaultModules, useCleanup} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const backwardVector = new THREE.Vector3(0, 0, 1);

export default () => {
  const app = useApp();
  const physics = usePhysics();
  const particleSystem = useParticleSystem();
  const cameraManager = useCameraManager();

  app.name = 'turret';

  let activated = false;
  let activateCb = null;
  let frameCb = null;
  useActivate(() => {
    activateCb && activateCb();
  });
  useFrame(({timestamp, timeDiff}) => {
    if (frameCb) {
      const timeDiffS = timeDiff/1000;
      frameCb(timeDiffS);
    }
  });

  let physicsIds = [];
  (async () => {
    const u = `${baseUrl}turret.glb`;
    let o = await new Promise((accept, reject) => {
      const {gltfLoader} = useLoaders();
      gltfLoader.load(u, accept, function onprogress() {}, reject);
    });
    const {animations} = o;
    o = o.scene;
    app.add(o);

    // console.log('got animations', animations);

    const _shake = () => {
      localVector.setFromMatrixPosition(o.matrixWorld);
      cameraManager.addShake(localVector, 0.2, 30, 500);
    };

    const mixers = [];
    const animation = animations.find(a => a.name === 'Turett|turret_fire');
    const actions = [];
    const mixer = new THREE.AnimationMixer(o);
    mixer.addEventListener('loop', e => {
      // console.log('got mixer loop', e);
      _shake();
    });
    mixers.push(mixer);
    const action = mixer.clipAction(animation);
    // action.setLoop(THREE.LoopOnce);
    actions.push(action);
    // const mixer = new THREE.AnimationMixer(o);
    // const actions = animations.find(a => a.name === 'Turett|turret_fire').map(animationClip => mixer.clipAction(animationClip));

    // console.log('got actions', animations, actions);

    activateCb = () => {
      activated = !activated;

      if (activated) {
        for (const action of actions) {
          action.reset();
          action.play();
        }
        _shake();
      } else {
        action.stop();
      }
    };
    frameCb = deltaSeconds => {
      if (activated) {
        const localPlayer = useLocalPlayer();
        localVector.copy(localPlayer.position)
          .sub(localVector2.setFromMatrixPosition(o.matrixWorld));
        localVector.y = 0;
        localVector.normalize();
        const targetQuaternion = localQuaternion.setFromUnitVectors(backwardVector, localVector);
        o.quaternion.slerp(targetQuaternion, 2 * deltaSeconds);
      }

      // console.log('mixer update', deltaSeconds);
      for (const mixer of mixers) {
        mixer.update(deltaSeconds);
      }
      o.updateMatrixWorld();
    };

    const physicsId = physics.addGeometry(o);
    physicsIds.push(physicsId);
  })();
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};
