import * as THREE from 'three';
// import easing from './easing.js';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useActivate, useLoaders, usePhysics, addTrackedApp, useDefaultModules, useCleanup} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

export default () => {
  const app = useApp();
  const physics = usePhysics();

  app.name = 'turret';

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

    const mixers = [];
    const animation = animations.find(a => a.name === 'Turett|turret_fire');
    const actions = [];
    const mixer = new THREE.AnimationMixer(o);
    mixers.push(mixer);
    const action = mixer.clipAction(animation);
    // action.setLoop(THREE.LoopOnce);
    actions.push(action);
    // const mixer = new THREE.AnimationMixer(o);
    // const actions = animations.find(a => a.name === 'Turett|turret_fire').map(animationClip => mixer.clipAction(animationClip));

    // console.log('got actions', animations, actions);

    activateCb = () => {
      // console.log('activate', actions);
      for (const action of actions) {
        action.reset();
        action.play();
        // action.time = 0;
        // action.time = startOffset;
      }
    };
    frameCb = deltaSeconds => {
      // console.log('mixer update', deltaSeconds);
      for (const mixer of mixers) {
        mixer.update(deltaSeconds);
      }
      o.updateMatrixWorld();
    };

    // app.updateMatrixWorld();

    /* let baseMesh = null;
    o.traverse(o => {
      if (!baseMesh && o.isMesh && /base_container/i.test(o.name)) {
        baseMesh = o;
      }
    }); */
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
