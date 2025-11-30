import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  GlowLayer,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3
} from 'babylonjs';

type HeroSceneRefs = {
  leftPaddle: AbstractMesh;
  rightPaddle: AbstractMesh;
  ball: AbstractMesh;
};

/**
 * Small Babylon.js scene that recreates a stylized Pong arena with animated paddles + ball.
 */
export class BabylonHero {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationTime = 0;
  private resizeHandler = () => {
    if (this.engine) {
      this.engine.resize();
    }
  };

  init(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'babylon-hero-canvas';
    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = this.buildScene(this.engine);

    this.engine.runRenderLoop(() => {
      if (!this.scene) return;
      this.animationTime += this.scene.getEngine().getDeltaTime() / 1000;
      this.animateScene(this.scene, this.animationTime);
      this.scene.render();
    });

    window.addEventListener('resize', this.resizeHandler);
  }

  dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.scene?.dispose();
    this.engine?.dispose();
    this.canvas?.remove();
    this.scene = null;
    this.engine = null;
    this.canvas = null;
  }

  private buildScene(engine: Engine): Scene {
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromColor3(Color3.FromHexString('#0a0c1d'), 1);

    // Camera locked at an angle overlooking the arena.
    const camera = new ArcRotateCamera('hero-camera', Math.PI / -3, Math.PI / 2.8, 18, new Vector3(0, 1, 0), scene);
    camera.lowerRadiusLimit = 16;
    camera.upperRadiusLimit = 18;
    camera.useAutoRotationBehavior = true;
    const autoRotation = camera.autoRotationBehavior;
    if (autoRotation) {
      autoRotation.idleRotationSpeed = 0.1;
      autoRotation.idleRotationSpinupTime = 1500;
      autoRotation.idleRotationWaitTime = 500;
    }

    // Lighting
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.6;
    const point = new PointLight('point', new Vector3(0, 4, -4), scene);
    point.intensity = 0.9;
    point.diffuse = Color3.FromHexString('#f4a259');

    new GlowLayer('hero-glow', scene, { blurKernelSize: 64, intensity: 0.4 });

    // Arena floor
    const arena = MeshBuilder.CreateBox('arena', { width: 12, depth: 7, height: 0.3 }, scene);
    const arenaMat = new StandardMaterial('arena-mat', scene);
    arenaMat.diffuseColor = Color3.FromHexString('#1f2140');
    arenaMat.emissiveColor = Color3.FromHexString('#181a32');
    arena.material = arenaMat;
    arena.position.y = -1.5;

    // Mid line glow
    const midLine = MeshBuilder.CreateBox('mid', { width: 0.1, depth: 6.8, height: 0.1 }, scene);
    const midMat = new StandardMaterial('mid-mat', scene);
    midMat.emissiveColor = Color3.FromHexString('#52b788');
    midLine.material = midMat;
    midLine.position.y = -1;

    // Paddles
    const paddleMaterialLeft = new StandardMaterial('paddle-left', scene);
    paddleMaterialLeft.emissiveColor = Color3.FromHexString('#e76f51');
    const paddleMaterialRight = new StandardMaterial('paddle-right', scene);
    paddleMaterialRight.emissiveColor = Color3.FromHexString('#6c9ca8');

    const paddleShape = { width: 0.6, height: 2, depth: 0.4 };
    const leftPaddle = MeshBuilder.CreateBox('left', paddleShape, scene);
    leftPaddle.material = paddleMaterialLeft;
    leftPaddle.position = new Vector3(-5.2, -0.4, 0);

    const rightPaddle = MeshBuilder.CreateBox('right', paddleShape, scene);
    rightPaddle.material = paddleMaterialRight;
    rightPaddle.position = new Vector3(5.2, -0.4, 0);

    const ball = MeshBuilder.CreateSphere('ball', { diameter: 0.6 }, scene);
    const ballMat = new StandardMaterial('ball-mat', scene);
    ballMat.emissiveColor = Color3.FromHexString('#f4a259');
    ball.material = ballMat;
    ball.position = new Vector3(0, -0.4, 0);

    const refs: HeroSceneRefs = { leftPaddle, rightPaddle, ball };
    scene.metadata = refs;
    return scene;
  }

  private animateScene(scene: Scene, time: number): void {
    const metadata = scene.metadata as HeroSceneRefs | undefined;
    if (!metadata) return;

    const wave = Math.sin(time * 2);
    const counterWave = Math.cos(time * 2.2);

    metadata.leftPaddle.position.z = wave * 2.2;
    metadata.leftPaddle.rotation.y = wave * 0.2;

    metadata.rightPaddle.position.z = -counterWave * 2.1;
    metadata.rightPaddle.rotation.y = counterWave * 0.2;

    metadata.ball.position.x = Math.sin(time * 1.5) * 4.5;
    metadata.ball.position.z = Math.cos(time * 2.5) * 2.8;
    metadata.ball.position.y = -0.4 + Math.sin(time * 4) * 0.2;
  }
}
