const CanvasController = require("./CanvasController");
const Organism = require("../Organism/Organism");
const Modes = require("./ControlModes");
const CellStates = require("../Organism/Cell/CellStates");
const Neighbors = require("../Grid/Neighbors");
const FossilRecord = require("../Stats/FossilRecord");
const WorldConfig = require("../WorldConfig");
const Perlin = require("../Utils/Perlin");

class EnvironmentController extends CanvasController {
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.Drag;
        this.org_to_clone = null;
        this.defineZoomControls();
        this.scale = 1;
    }

    defineZoomControls() {
        let scale = 1;
        const zoom_speed = 0.5;
        const el = document.querySelector("#env-canvas");
        el.onwheel = function zoom(event) {
            event.preventDefault();

            const sign = -Math.sign(event.deltaY);

            // Restrict scale
            scale = Math.max(0.5, this.scale + sign * zoom_speed);

            const cur_top = parseInt($("#env-canvas").css("top"));
            const cur_left = parseInt($("#env-canvas").css("left"));

            const diff_x =
                (this.canvas.width / 2 - this.mouse_x) * (scale - this.scale);
            const diff_y =
                (this.canvas.height / 2 - this.mouse_y) * (scale - this.scale);

            $("#env-canvas").css("top", cur_top + diff_y + "px");
            $("#env-canvas").css("left", cur_left + diff_x + "px");

            // Apply scale transform
            el.style.transform = `scale(${scale})`;
            this.scale = scale;
        }.bind(this);
    }

    resetView() {
        $("#env-canvas").css("transform", "scale(1)");
        $("#env-canvas").css("top", "0px");
        $("#env-canvas").css("left", "0px");
        this.scale = 1;
    }

    /*
    Iterate over grid from 0,0 to env.num_cols,env.num_rows and create random walls using perlin noise to create a more organic shape.
    */
    randomizeWalls(thickness = 1) {
        this.env.clearWalls();
        const noise_threshold = -0.017;
        const resolution = 20;
        Perlin.seed();

        for (let r = 0; r < this.env.num_rows; r++) {
            for (let c = 0; c < this.env.num_cols; c++) {
                const xval =
                    (c / this.env.num_cols) *
                    ((resolution / this.env.renderer.cell_size) *
                        (this.env.num_cols / this.env.num_rows));
                const yval =
                    (r / this.env.num_rows) *
                    ((resolution / this.env.renderer.cell_size) *
                        (this.env.num_rows / this.env.num_cols));
                const noise = Perlin.get(xval, yval);
                if (
                    noise > noise_threshold &&
                    noise < noise_threshold + thickness / resolution
                ) {
                    const cell = this.env.grid_map.cellAt(c, r);
                    if (cell != null) {
                        if (cell.owner != null) cell.owner.die();
                        this.env.changeCell(c, r, CellStates.wall, null);
                    }
                }
            }
        }
    }

    updateMouseLocation(offsetX, offsetY) {
        super.updateMouseLocation(offsetX, offsetY);
    }

    mouseMove() {
        this.performModeAction();
    }

    mouseDown() {
        this.start_x = this.mouse_x;
        this.start_y = this.mouse_y;
        this.performModeAction();
    }

    mouseUp() {}

    modeActions = {
        [Modes.FoodDrop]: {
            left: (cell) => {
                this.dropCellType(cell.col, cell.row, CellStates.food, false);
            },
            right: (cell) => {
                this.dropCellType(cell.col, cell.row, CellStates.empty, false);
            },
        },
        [Modes.WallDrop]: {
            left: (cell) => {
                this.dropCellType(cell.col, cell.row, CellStates.wall, true);
            },
            right: (cell) => {
                this.dropCellType(cell.col, cell.row, CellStates.empty, false);
            },
        },
        [Modes.ClickKill]: {
            left: () => {
                this.killNearOrganisms();
            },
        },
        [Modes.Select]: {
            left: () => {
                if (this.cur_org == null) {
                    this.cur_org = this.findNearOrganism();
                }
                if (this.cur_org != null) {
                    this.control_panel.setEditorOrganism(this.cur_org);
                }
            },
        },
        [Modes.Clone]: {
            left: () => {
                if (this.org_to_clone != null) {
                    this.dropOrganism(
                        this.org_to_clone,
                        this.mouse_c,
                        this.mouse_r
                    );
                }
            },
        },
        [Modes.Drag]: {
            left: () => {
                this.drag();
            },
        },
    };

    performModeAction() {
        if (WorldConfig.headless && this.mode !== Modes.Drag) return;

        if (this.active_button === "middle") {
            return this.drag();
        }

        if (this.cur_cell == null) return;

        this.modeActions[this.mode]?.[this.active_button]?.(this.cur_cell);
    }

    drag() {
        const canvas = $("#env-canvas");
        const cur_top = parseInt(canvas.css("top"), 10);
        const cur_left = parseInt(canvas.css("left"), 10);
        const new_top = cur_top + (this.mouse_y - this.start_y) * this.scale;
        const new_left = cur_left + (this.mouse_x - this.start_x) * this.scale;
        canvas.css("top", new_top + "px");
        canvas.css("left", new_left + "px");
    }

    dropOrganism(organism, col, row) {
        // close the organism and drop it in the world
        const new_org = new Organism(col, row, this.env, organism);
        if (!new_org.isClear(col, row)) return false;

        FossilRecord.registerOrganismSpecies(new_org, this.env.total_ticks);
        this.env.addOrganism(new_org);
        return true;
    }

    dropCellType(col, row, state, killBlocking = false) {
        for (const loc of Neighbors.allSelf) {
            const c = col + loc[0];
            const r = row + loc[1];
            const cell = this.env.grid_map.cellAt(c, r);
            if (cell == null) continue;
            if (killBlocking && cell.owner != null) {
                cell.owner.die();
            } else if (cell.owner != null) {
                continue;
            }
            this.env.changeCell(c, r, state, null);
        }
    }

    findNearOrganism() {
        for (const loc of Neighbors.all) {
            const c = this.cur_cell.col + loc[0];
            const r = this.cur_cell.row + loc[1];
            const cell = this.env.grid_map.cellAt(c, r);
            if (cell != null && cell.owner != null) return cell.owner;
        }
        return null;
    }

    killNearOrganisms() {
        for (const loc of Neighbors.allSelf) {
            const c = this.cur_cell.col + loc[0];
            const r = this.cur_cell.row + loc[1];
            const cell = this.env.grid_map.cellAt(c, r);
            if (cell != null && cell.owner != null) cell.owner.die();
        }
    }
}

module.exports = EnvironmentController;
