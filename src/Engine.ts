import WorldEnvironment from "./Environments/WorldEnvironment";
import ControlPanel from "./Controllers/ControlPanel";
import OrganismEditor from "./Environments/OrganismEditor";
import ColorScheme from "./Rendering/ColorScheme";

class Engine {
    public readonly defaultFps = 60;
    public readonly maxFps = 300;

    private targetFps = this.defaultFps;
    public get actualFps() {
        return 1000 / this.lastTickDuration;
    }

    private readonly env: WorldEnvironment;
    private readonly controlPanel: ControlPanel;
    private readonly organismEditor: OrganismEditor;
    private readonly colorscheme: ColorScheme;

    private simLoop: number | null = null;
    private lastTick = Date.now();
    private lastTickDuration = Infinity;

    public get running() {
        return this.simLoop !== null;
    }
    public get fps() {
        return this.targetFps;
    }
    constructor() {
        this.env = new WorldEnvironment(5);
        this.organismEditor = new OrganismEditor();
        this.controlPanel = new ControlPanel(this);
        this.colorscheme = new ColorScheme(this.env, this.organismEditor);
        this.colorscheme.loadColorScheme();
        this.env.OriginOfLife();
    }

    start(fps?: number) {
        const targetFps = Math.max(
            1,
            Math.min(fps ?? this.defaultFps, this.maxFps)
        );
        if (this.simLoop && this.targetFps === targetFps) return;

        if (this.simLoop) window.clearInterval(this.simLoop);

        this.targetFps = targetFps;
        this.simLoop = window.setInterval(
            () => this.tick(),
            this.targetFps === this.maxFps ? 0 : 1000 / this.targetFps
        );
    }

    tick() {
        this.environmentUpdate();
        this.renderTick();
    }

    stop() {
        if (!this.simLoop) return;
        window.clearInterval(this.simLoop);
    }

    restart(fps: number) {
        if (this.simLoop) window.clearInterval(this.simLoop);
        this.start(fps);
    }

    environmentUpdate() {
        this.lastTickDuration = Date.now() - this.lastTick;
        this.lastTick = Date.now();
        this.env.update();
    }

    renderTick() {
        this.env.render();
        this.controlPanel.onTick();
        this.organismEditor.update();
    }
}

export default Engine;
