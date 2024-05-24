const Hyperparams = require("../Hyperparameters");
const Modes = require("./ControlModes");
const StatsPanel = require("../Stats/StatsPanel");
const WorldConfig = require("../WorldConfig");
const LoadController = require("./LoadController");

class ControlPanel {
    constructor(engine) {
        this.engine = engine;
        this.defineMinMaxControls();
        this.defineHotkeys();
        this.defineEngineSpeedControls();
        this.defineTabNavigation();
        this.defineHyperParamsControls();
        this.defineWorldControls();
        this.defineModeControls();
        this.fps = engine.fps;
        this.env_controller = this.engine.env.controller;
        this.editor_controller = this.engine.organism_editor.controller;
        this.env_controller.setControlPanel(this);
        this.editor_controller.setControlPanel(this);
        this.stats_panel = new StatsPanel(this.engine.env);
        this.loadHyperParams();
        LoadController.control_panel = this;
    }

    display_hud = true;
    display_control_panel = false;

    defineMinMaxControls() {
        $("#minimize").on("click", () => {
            $(".control-panel").css("display", "none");
            $(".hot-controls").css("display", "block");
            this.display_control_panel = false;
            this.stats_panel.stopAutoRender();
        });
        $("#maximize").on("click", () => {
            $(".control-panel").css("display", "grid");
            $(".hot-controls").css("display", "none");
            this.display_control_panel = true;
            if (this.active_controller === "stats") {
                this.stats_panel.startAutoRender();
            }
        });
    }

    buttonHotkeys = {
        // hotbar buttons
        a: "#reset-view",
        s: "#drag-view",
        d: "#wall-drop",
        f: "#food-drop",
        g: "#click-kill",
        h: "#headless",
        // editor buttons
        z: "#select",
        x: "#edit",
        c: "#drop-org",
    };

    actionHotkeys = {
        [" "]: (e) => this.togglePause(e),
        ["j"]: (e) => this.togglePause(e),
        ["q"]: (e) => this.togglePanel(e),
        ["v"]: (e) => this.toggleHud(e),
    };

    isTyping() {
        const focused = document.activeElement;
        return focused.tagName === "INPUT" && focused.type === "text";
    }

    togglePanel(event) {
        event.preventDefault();
        $(this.display_control_panel ? "#minimize" : "#maximize").trigger(
            "click"
        );
    }

    toggleHud(event) {
        if (this.display_hud) {
            this.restoreHud();
        } else {
            $(".control-panel").css("display", "none");
            $(".hot-controls").css("display", "none");
            $(".community-section").css("display", "none");
            LoadController.close();
        }
    }

    restoreHud() {
        if (this.display_control_panel) {
            $(".control-panel").css("display", "grid");
            if (this.active_controller === "stats")
                this.stats_panel.startAutoRender();
        } else {
            $(".hot-controls").css("display", "block");
        }
        $(".community-section").css("display", "block");
    }

    defineHotkeys() {
        $("body").on("keydown", (e) => {
            // No hotkeys when typing in inputs
            if (this.isTyping()) return;

            const key = e.key.toLowerCase();

            // Basic clicks
            if (key in this.buttonHotkeys) {
                return $(this.buttonHotkeys[key]).trigger("click");
            }

            if (key in this.actionHotkeys) {
                return this.actionHotkeys[key](e);
            }
        });
    }

    defineEngineSpeedControls() {
        this.slider = document.getElementById("slider");
        this.slider.oninput = () => {
            const max_fps = 300;
            this.fps = this.slider.value;
            if (this.fps >= max_fps) this.fps = 1000;
            if (this.engine.running) {
                this.changeEngineSpeed(this.fps);
            }
            const text = this.fps >= max_fps ? "MAX" : this.fps;
            $("#fps").text("Target FPS: " + text);
        };

        $(".pause-button").on("click", () =>
            this.setPaused(this.engine.running)
        );

        $(".headless").on("click", () => {
            WorldConfig.headless = !WorldConfig.headless;

            if (!WorldConfig.headless) {
                this.engine.env.renderFull();
            }

            $("#headless-notification").css(
                "display",
                WorldConfig.headless ? "block" : "none"
            );
            const headlessIcon = $(".headless").find("i");
            headlessIcon.toggleClass("fa-eye");
            headlessIcon.toggleClass("fa-eye-slash");
        });
    }

    togglePause(event) {
        event.preventDefault();
        $("#pause-button").trigger("click");
    }

    setPaused(paused) {
        const pauseButtonIcon = $(".pause-button").find("i");
        pauseButtonIcon.toggleClass("fa-pause");
        pauseButtonIcon.toggleClass("fa-play");
        if (paused) {
            this.engine.stop();
        } else {
            this.engine.start(this.fps);
        }
    }

    defineTabNavigation() {
        $(() => this.switchTab("about"));
        const self = this;
        $(".tabnav-item").on("click", function () {
            self.switchTab(this.id.replace("tabnav-item-", ""));
        });
    }

    switchTab(controllerName) {
        this.active_controller = controllerName;

        $(".tab").css("display", "none");
        $(".tabnav-item").removeClass("open-tab");

        $(`#tab-${controllerName}`).css("display", "grid");
        $(`#tabnav-item-${controllerName}`).addClass("open-tab");

        this.stats_panel.stopAutoRender();
        if (controllerName === "stats") {
            this.stats_panel.startAutoRender();
        } else if (controllerName === "editor") {
            this.editor_controller.refreshDetailsPanel();
            this.engine.organism_editor.is_active = true;
        }
    }

    defineWorldControls() {
        $("#fill-window").on("change", function () {
            if (this.checked) $(".col-row-input").css("display", "none");
            else $(".col-row-input").css("display", "block");
        });

        $("#resize").on("click", () => {
            const cell_size = $("#cell-size").val();
            const fill_window = $("#fill-window").is(":checked");
            if (fill_window) {
                this.engine.env.resizeFillWindow(cell_size);
            } else {
                const cols = $("#col-input").val();
                const rows = $("#row-input").val();
                this.engine.env.resizeGridColRow(cell_size, cols, rows);
            }
            this.engine.env.reset();
            this.stats_panel.reset();
        });

        this.bindBooleanParameter(WorldConfig, "#auto-reset", "auto_reset");
        this.bindBooleanParameter(WorldConfig, "#auto-pause", "auto_pause");
        this.bindBooleanParameter(
            WorldConfig,
            "#clear-walls-reset",
            "clear_walls_on_reset"
        );

        $("#reset-with-editor-org").on("click", () => {
            const env = this.engine.env;
            if (!env.reset(true, false)) return;
            const center = env.grid_map.getCenter();
            const org = this.editor_controller.env.getCopyOfOrg();
            this.env_controller.dropOrganism(org, center[0], center[1]);
        });

        $("#save-env").on("click", () => {
            const was_running = this.engine.running;
            this.setPaused(true);
            const env = this.engine.env.serialize();
            const data =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(env));
            const downloadEl = document.getElementById("download-el");
            downloadEl.setAttribute("href", data);
            downloadEl.setAttribute(
                "download",
                $("#save-env-name").val() + ".json"
            );
            downloadEl.trigger("click");
            if (was_running) this.setPaused(false);
        });
        $("#load-env").on("click", () => {
            LoadController.loadJson((env) => {
                this.loadEnv(env);
            });
        });
    }

    bindParameter(param, selector, key, extract = (elt) => elt.value) {
        $(selector).on("change", function () {
            param[key] = extract(this);
            console.log(key, Hyperparams[key]);
        });
    }

    bindBooleanParameter(param, selector, paramKey, negate = false) {
        const extractor = negate ? (elt) => !elt.checked : (elt) => elt.checked;
        this.bindParameter(param, selector, paramKey, extractor);
    }

    defineHyperParamsControls() {
        this.bindHyperParams();

        $("#reset-rules").on("click", () => {
            this.resetHyperParams();
        });
        $("#save-controls").on("click", () => {
            const data =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(Hyperparams));
            const downloadEl = document.getElementById("download-el");
            downloadEl.setAttribute("href", data);
            downloadEl.setAttribute("download", "controls.json");
            downloadEl.trigger("click");
        });
        $("#load-controls").on("click", () => {
            $("#upload-hyperparams").trigger("click");
        });
        $("#upload-hyperparams").on("change", (e) => {
            const files = e.target.files;
            if (!files.length) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = JSON.parse(e.target.result);
                Hyperparams.loadJsonObj(result);
                this.loadHyperParams();
                // have to clear the value so change() will be triggered if the same file is uploaded again
                $("#upload-hyperparams")[0].value = "";
            };
            reader.readAsText(files[0]);
        });
    }

    bindHyperParams() {
        this.bindParameter(Hyperparams, "#food-prod-prob", "foodProdProb");
        this.bindParameter(
            Hyperparams,
            "#lifespan-multiplier",
            "lifespanMultiplier"
        );
        this.bindBooleanParameter(
            Hyperparams,
            "#rot-enabled",
            "rotationEnabled"
        );
        this.bindBooleanParameter(Hyperparams, "#insta-kill", "instaKill");
        this.bindParameter(Hyperparams, "#look-range", "lookRange");
        this.bindBooleanParameter(
            Hyperparams,
            "#see-through-self",
            "seeThroughSelf"
        );
        this.bindParameter(Hyperparams, "#food-drop-rate", "foodDropProb");
        this.bindParameter(Hyperparams, "#cell-weight", "cellWeight");
        this.bindParameter(
            Hyperparams,
            "#evolutive-mutation",
            "useEvolutiveMutability",
            (elt) => {
                const useEvolutiveMutability = !elt.checked;
                if (useEvolutiveMutability) {
                    $(".global-mutation-in").css("display", "block");
                    $("#avg-mut").css("display", "none");
                } else {
                    $(".global-mutation-in").css("display", "none");
                    $("#avg-mut").css("display", "block");
                }
            }
        );
        this.bindParameter(Hyperparams, "#global-mutation", "globalMutability");
        this.bindParameter(Hyperparams, "#add-prob", "addProb");
        this.bindParameter(Hyperparams, "#change-prob", "changeProb");
        this.bindParameter(Hyperparams, "#remove-prob", "removeProb");
        this.bindBooleanParameter(
            Hyperparams,
            "#moves-produce",
            "moversCanProduce"
        );
        this.bindBooleanParameter(
            Hyperparams,
            "#food-blocks",
            "foodBlocksReproduction"
        );
    }

    resetHyperParams() {
        Hyperparams.setDefaults();
        this.loadHyperParams();
    }

    loadHyperParams() {
        $("#food-prod-prob").val(Hyperparams.foodProdProb);
        $("#lifespan-multiplier").val(Hyperparams.lifespanMultiplier);
        $("#rot-enabled").prop("checked", Hyperparams.rotationEnabled);
        $("#insta-kill").prop("checked", Hyperparams.instaKill);
        $("#evolutive-mutation").prop(
            "checked",
            Hyperparams.useEvolutiveMutability
        );
        $("#add-prob").val(Hyperparams.addProb);
        $("#change-prob").val(Hyperparams.changeProb);
        $("#remove-prob").val(Hyperparams.removeProb);
        $("#movers-produce").prop("checked", Hyperparams.moversCanProduce);
        $("#food-blocks").prop("checked", Hyperparams.foodBlocksReproduction);
        $("#food-drop-rate").val(Hyperparams.foodDropProb);
        $("#cell-weight").val(Hyperparams.cellWeight);
        $("#look-range").val(Hyperparams.lookRange);
        $("#see-through-self").prop("checked", Hyperparams.seeThroughSelf);
        $("#global-mutation").val(Hyperparams.globalMutability);

        if (!Hyperparams.useEvolutiveMutability) {
            $(".global-mutation-in").css("display", "none");
            $("#avg-mut").css("display", "block");
        } else {
            $(".global-mutation-in").css("display", "block");
            $("#avg-mut").css("display", "none");
        }
    }

    loadEnv(env) {
        if (this.active_controller === "stats")
            this.stats_panel.stopAutoRender();
        const was_running = this.engine.running;
        this.setPaused(true);
        this.engine.env.loadRaw(env);
        if (was_running) this.setPaused(false);
        this.loadHyperParams();
        this.env_controller.resetView();
        if (this.active_controller === "stats")
            this.stats_panel.startAutoRender();
    }

    defineModeControls() {
        this.bindModeButton("food-drop", Modes.FoodDrop);
        this.bindModeButton("wall-drop", Modes.WallDrop);
        this.bindModeButton("click-kill", Modes.ClickKill);
        this.bindModeButton("edit", Modes.Edit);
        this.bindModeButton("select", Modes.Select);
        this.bindModeButton("drop-org", Modes.Clone);
        this.bindModeButton("drag-view", Modes.Drag);
        $(".reset-view").on("click", () => this.env_controller.resetView());

        $("#reset-env").on("click", () => {
            this.engine.env.reset();
            this.stats_panel.reset();
        });
        $("#clear-env").on("click", () => {
            this.engine.env.reset(true, false);
            this.stats_panel.reset();
        });
        $("#random-walls").on("click", () =>
            this.env_controller.randomizeWalls()
        );
        $("#clear-walls").on("click", () => {
            if (!confirm("This will remove all walls. Proceed?")) return;
            this.engine.env.clearWalls();
        });
        $("#clear-editor").on("click", () => {
            this.engine.organism_editor.clear();
            this.editor_controller.setEditorPanel();
        });
        $("#generate-random").on("click", () => {
            this.engine.organism_editor.createRandom();
            this.editor_controller.refreshDetailsPanel();
        });
        $(".reset-random").on(
            "click",
            function () {
                this.engine.organism_editor.resetWithRandomOrgs(
                    this.engine.env
                );
            }.bind(this)
        );

        window.onbeforeunload = function (e) {
            if (process.env.NODE_ENV === "development") {
                console.log("[dev] no page close confirmation");
                return;
            }
            e = e ?? window.event;

            const return_str = "this will cause a confirmation on page close";
            if (e) {
                e.returnValue = return_str;
            }
            return return_str;
        };
    }

    bindModeButton(className, mode) {
        const selector = `.edit-mode-button, .${className}`;
        $(selector).on("click", () => {
            $(".edit-mode-btn").removeClass("selected");
            $("#cell-selections").css("display", "none");
            $("#organism-options").css("display", "none");

            $(selector).addClass("selected");
            this.editor_controller.setDetailsPanel();
            this.setMode(mode);
        });
    }

    setMode(mode) {
        this.env_controller.mode = mode;
        this.editor_controller.mode = mode;

        if (mode === Modes.Edit) {
            this.editor_controller.setEditorPanel();
        } else if (mode === Modes.Clone) {
            this.env_controller.org_to_clone =
                this.engine.organism_editor.getCopyOfOrg();
        }
    }

    setEditorOrganism(org) {
        this.engine.organism_editor.setOrganismToCopyOf(org);
        this.editor_controller.clearDetailsPanel();
        this.editor_controller.setDetailsPanel();
    }

    changeEngineSpeed(change_val) {
        this.engine.restart(change_val);
        this.fps = this.engine.fps;
    }

    update() {
        $("#fps-actual").text(
            `Actual FPS: ${Math.floor(this.engine.actual_fps)}`
        );
        $("#reset-count").text(
            `Auto reset count: ${this.engine.env.reset_count}`
        );
        this.stats_panel.updateDetails();
    }
}

module.exports = ControlPanel;
