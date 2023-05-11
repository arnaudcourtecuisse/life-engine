const Environment = require("./Environment");
const Renderer = require("../Rendering/Renderer");
const GridMap = require("../Grid/GridMap");
const Organism = require("../Organism/Organism");
const CellStates = require("../Organism/Cell/CellStates");
const EnvironmentController = require("../Controllers/EnvironmentController");
const Hyperparams = require("../Hyperparameters.js");
const FossilRecord = require("../Stats/FossilRecord");
const WorldConfig = require("../WorldConfig");
const SerializeHelper = require("../Utils/SerializeHelper");

class WorldEnvironment extends Environment {
    constructor(cell_size) {
        super();
        this.renderer = new Renderer("env-canvas", "env", cell_size);
        this.controller = new EnvironmentController(this, this.renderer.canvas);
        this.num_rows = Math.ceil(this.renderer.height / cell_size);
        this.num_cols = Math.ceil(this.renderer.width / cell_size);
        this.grid_map = new GridMap(this.num_cols, this.num_rows, cell_size);
        this.organisms = [];
        this.walls = [];
        this.total_mutability = 0;
        this.reset_count = 0;
        this.total_ticks = 0;
        this.data_update_rate = 100;
        FossilRecord.setEnv(this);
    }

    update() {
        const to_remove = [];
        for (const i in this.organisms) {
            const org = this.organisms[i];
            if (!org.living || !org.update()) {
                to_remove.push(i);
            }
        }
        this.removeOrganisms(to_remove);
        if (Hyperparams.foodDropProb > 0) {
            this.generateFood();
        }
        this.total_ticks++;
        if (this.total_ticks % this.data_update_rate == 0) {
            FossilRecord.updateData();
        }
    }

    render() {
        if (WorldConfig.headless) {
            this.renderer.cells_to_render.clear();
            return;
        }
        this.renderer.renderCells();
        this.renderer.renderHighlights();
    }

    renderFull() {
        this.renderer.renderFullGrid(this.grid_map.grid);
    }

    removeOrganisms(org_indeces) {
        const start_pop = this.organisms.length;
        for (const i of org_indeces.reverse()) {
            this.total_mutability -= this.organisms[i].mutability;
            this.organisms.splice(i, 1);
        }
        if (this.organisms.length === 0 && start_pop > 0) {
            if (WorldConfig.auto_pause) $(".pause-button")[0].click();
            else if (WorldConfig.auto_reset) {
                this.reset_count++;
                this.reset(false);
            }
        }
    }

    OriginOfLife() {
        const center = this.grid_map.getCenter();
        const org = new Organism(center[0], center[1], this);
        org.anatomy.addDefaultCell(CellStates.mouth, 0, 0);
        org.anatomy.addDefaultCell(CellStates.producer, 1, 1);
        org.anatomy.addDefaultCell(CellStates.producer, -1, -1);
        this.addOrganism(org);
        FossilRecord.registerOrganismSpecies(org, 0);
    }

    addOrganism(organism) {
        organism.updateGrid();
        this.total_mutability += organism.mutability;
        this.organisms.push(organism);
    }

    averageMutability() {
        if (this.organisms.length < 1) return 0;
        return this.total_mutability / this.organisms.length;
    }

    changeCell(c, r, state, owner) {
        super.changeCell(c, r, state, owner);
        const cell = this.grid_map.cellAt(c, r);
        this.renderer.addToRender(cell);
        if (state == CellStates.wall) this.walls.push(cell);
    }

    clearWalls() {
        for (const wall of this.walls) {
            const wcell = this.grid_map.cellAt(wall.col, wall.row);
            if (wcell && wcell.state == CellStates.wall)
                this.changeCell(wall.col, wall.row, CellStates.empty, null);
        }
    }

    clearOrganisms() {
        for (const org of this.organisms) org.die();
        this.organisms = [];
    }

    clearDeadOrganisms() {
        const to_remove = [];
        for (const i in this.organisms) {
            const org = this.organisms[i];
            if (!org.living) to_remove.push(i);
        }
        this.removeOrganisms(to_remove);
    }

    generateFood() {
        const num_food = Math.max(
            Math.floor(
                (this.grid_map.cols *
                    this.grid_map.rows *
                    Hyperparams.foodDropProb) /
                    50000
            ),
            1
        );
        const prob = Hyperparams.foodDropProb;
        for (let i = 0; i < num_food; i++) {
            if (Math.random() <= prob) {
                const c = Math.floor(Math.random() * this.grid_map.cols);
                const r = Math.floor(Math.random() * this.grid_map.rows);

                if (this.grid_map.cellAt(c, r).state == CellStates.empty) {
                    this.changeCell(c, r, CellStates.food, null);
                }
            }
        }
    }

    reset(confirm_reset = true, reset_life = true) {
        if (
            confirm_reset &&
            !confirm("The current environment will be lost. Proceed?")
        )
            return false;

        this.organisms = [];
        this.grid_map.fillGrid(
            CellStates.empty,
            !WorldConfig.clear_walls_on_reset
        );
        this.renderer.renderFullGrid(this.grid_map.grid);
        this.total_mutability = 0;
        this.total_ticks = 0;
        FossilRecord.clear_record();
        if (reset_life) this.OriginOfLife();
        return true;
    }

    resizeGridColRow(cell_size, cols, rows) {
        this.renderer.cell_size = cell_size;
        this.renderer.fillShape(rows * cell_size, cols * cell_size);
        this.grid_map.resize(cols, rows, cell_size);
    }

    resizeFillWindow(cell_size) {
        this.renderer.cell_size = cell_size;
        this.renderer.fillWindow("env");
        this.num_cols = Math.ceil(this.renderer.width / cell_size);
        this.num_rows = Math.ceil(this.renderer.height / cell_size);
        this.grid_map.resize(this.num_cols, this.num_rows, cell_size);
    }

    serialize() {
        this.clearDeadOrganisms();
        const env = SerializeHelper.copyNonObjects(this);
        env.grid = this.grid_map.serialize();
        env.organisms = [];
        for (const org of this.organisms) {
            env.organisms.push(org.serialize());
        }
        env.fossil_record = FossilRecord.serialize();
        env.controls = Hyperparams;
        return env;
    }

    loadRaw(env) {
        // species name->stats map, evolution controls,
        this.organisms = [];
        FossilRecord.clear_record();
        this.resizeGridColRow(
            this.grid_map.cell_size,
            env.grid.cols,
            env.grid.rows
        );

        this.grid_map.loadRaw(env.grid);
        FossilRecord.loadRaw(env.fossil_record);

        for (const orgRaw of env.organisms) {
            const org = new Organism(orgRaw.col, orgRaw.row, this);
            org.loadRaw(orgRaw);
            this.addOrganism(org);
            org.species = FossilRecord.loadSpeciesFromOrgAnatomy(
                orgRaw.species_name,
                org.anatomy
            );
        }
        SerializeHelper.overwriteNonObjects(env, this);
        if ($("#override-controls").is(":checked"))
            Hyperparams.loadJsonObj(env.controls);
        this.renderer.renderFullGrid(this.grid_map.grid);
    }
}

module.exports = WorldEnvironment;
