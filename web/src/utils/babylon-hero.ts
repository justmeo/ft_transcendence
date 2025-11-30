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

type PaddleSide = 'left' | 'right';

interface HeroSceneRefs {
  leftPaddle: AbstractMesh;
  rightPaddle: AbstractMesh;
  ball: AbstractMesh;
}

/**
 * Small Babylon.js scene that recreates a stylized Pong arena with animated paddles + ball.
 */
export class BabylonHero {
  private static readonly ARENA_BOUNDS = { x: 4.8, z: 2.8 };
  private static readonly BASE_BALL_HEIGHT = -0.4;
  private static readonly PADDLE_CHASE_STRENGTH = 6;

  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private sceneRefs: HeroSceneRefs | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private animationTime = 0;
  private ballVelocity = new Vector3(1, 0, 0.32).normalize();
  private ballSpeed = 5.2;
  private paddlePulse: Record<PaddleSide, number> = { left: 0, right: 0 };
  private resizeHandler = () => {
    if (this.engine) {
      this.engine.resize();
    }
  };

  /**
   * Mounts a canvas inside `container` and starts the Babylon render loop.
   */
  init(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'babylon-hero-canvas';
    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const { scene, refs } = this.buildScene(this.engine);
    this.scene = scene;
    this.sceneRefs = refs;

    this.engine.runRenderLoop(() => {
      if (!this.scene) {
        return;
      }
      const delta = this.scene.getEngine().getDeltaTime() / 1000;
      this.animationTime += delta;
      this.animateScene(delta);
      this.scene.render();
    });

    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Stops rendering and frees GPU resources.
   */
  dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.scene?.dispose();
    this.engine?.dispose();
    this.canvas?.remove();
    this.scene = null;
    this.engine = null;
    this.canvas = null;
    this.sceneRefs = null;
  }

  private buildScene(engine: Engine): { scene: Scene; refs: HeroSceneRefs } {
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
    ball.position = new Vector3(0, BabylonHero.BASE_BALL_HEIGHT, 0);

    return {
      scene,
      refs: { leftPaddle, rightPaddle, ball }
    };
  }

  private animateScene(delta: number): void {
    if (!this.sceneRefs) {
      return;
    }

    this.updateBall(this.sceneRefs.ball, delta);
    this.updatePaddles(this.sceneRefs.leftPaddle, this.sceneRefs.rightPaddle, this.sceneRefs.ball, delta);
  }

  private updateBall(ball: AbstractMesh, delta: number): void {
    const movement = this.ballVelocity.scale(this.ballSpeed * delta);
    ball.position.addInPlace(movement);

    // Bounce off the far edges of the arena
    if (ball.position.x <= -BabylonHero.ARENA_BOUNDS.x) {
      ball.position.x = -BabylonHero.ARENA_BOUNDS.x;
      this.redirectBall('left');
      this.paddlePulse.left = 1;
    } else if (ball.position.x >= BabylonHero.ARENA_BOUNDS.x) {
      ball.position.x = BabylonHero.ARENA_BOUNDS.x;
      this.redirectBall('right');
      this.paddlePulse.right = 1;
    }

    if (Math.abs(ball.position.z) >= BabylonHero.ARENA_BOUNDS.z) {
      ball.position.z = Math.sign(ball.position.z) * BabylonHero.ARENA_BOUNDS.z;
      this.ballVelocity.z *= -1;
      this.addEnglish();
    }

    // Subtle vertical bob to keep things lively
    ball.position.y = BabylonHero.BASE_BALL_HEIGHT + Math.sin(this.animationTime * 6) * 0.12;
  }

  private updatePaddles(
    leftPaddle: AbstractMesh,
    rightPaddle: AbstractMesh,
    ball: AbstractMesh,
    delta: number
  ): void {
    const smoothing = Math.min(1, delta * BabylonHero.PADDLE_CHASE_STRENGTH);
    const anticipatedZ = ball.position.z + this.ballVelocity.z * 0.6;
    const bob = Math.sin(this.animationTime * 3) * 0.15;

    leftPaddle.position.z += (ball.position.z + bob - leftPaddle.position.z) * smoothing;
    rightPaddle.position.z += (anticipatedZ - rightPaddle.position.z) * smoothing;

    leftPaddle.rotation.y = (ball.position.z - leftPaddle.position.z) * 0.05;
    rightPaddle.rotation.y = (anticipatedZ - rightPaddle.position.z) * 0.05;

    this.applyPaddlePulse(leftPaddle, 'left', delta);
    this.applyPaddlePulse(rightPaddle, 'right', delta);
  }

  private redirectBall(hitSide: PaddleSide): void {
    const direction = hitSide === 'left' ? 1 : -1;
    this.ballVelocity.x = Math.abs(this.ballVelocity.x) * direction;
    this.addEnglish(direction * 0.1);
    this.ensureVelocity();
    this.ballSpeed = 4.5 + Math.random() * 2;
  }

  private addEnglish(bias: number = 0): void {
    this.ballVelocity.z += (Math.random() - 0.5) * 0.4 + bias;
    this.ensureVelocity();
  }

  private ensureVelocity(): void {
    this.ballVelocity.normalize();
    if (Math.abs(this.ballVelocity.x) < 0.2) {
      this.ballVelocity.x += 0.25 * Math.sign(this.ballVelocity.x || 1);
      this.ballVelocity.normalize();
    }
  }

  private applyPaddlePulse(mesh: AbstractMesh, side: PaddleSide, delta: number): void {
    const current = this.paddlePulse[side];
    const scale = 1 + current * 0.12;
    mesh.scaling.y = scale;
    mesh.scaling.x = 1 + current * 0.04;
    this.paddlePulse[side] = Math.max(0, current - delta * 2.5);
  }
}
