const Environment = require("./Environment");
const Organism = require("../Organism/Organism");
const GridMap = require("../Grid/GridMap");
const Renderer = require("../Rendering/Renderer");
const CellStates = require("../Organism/Cell/CellStates");
const EditorController = require("../Controllers/EditorController");
const RandomOrganismGenerator = require("../Organism/RandomOrganismGenerator");

class OrganismEditor extends Environment {
    constructor() {
        super();
        this.is_active = true;
        const cell_size = 13;
        this.renderer = new Renderer("editor-canvas", "editor-env", cell_size);
        this.controller = new EditorController(this, this.renderer.canvas);
        this.grid_map = new GridMap(15, 15, cell_size);
        this.clear();
    }

    update() {
        if (this.is_active) {
            this.renderer.renderHighlights();
        }
    }

    changeCell(c, r, state, owner) {
        super.changeCell(c, r, state, owner);
        this.renderFull();
    }

    renderFull() {
        this.renderer.renderFullGrid(this.grid_map.grid);
    }

    // absolute c r, not local
    addCellToOrg(c, r, state) {
        const center = this.grid_map.getCenter();
        const loc_c = c - center[0];
        const loc_r = r - center[1];
        const prev_cell = this.organism.anatomy.getLocalCell(loc_c, loc_r);
        if (prev_cell != null) {
            const new_cell = this.organism.anatomy.replaceCell(
                state,
                prev_cell.loc_col,
                prev_cell.loc_row,
                false
            );
            this.changeCell(c, r, state, new_cell);
        } else if (this.organism.anatomy.canAddCellAt(loc_c, loc_r)) {
            this.changeCell(
                c,
                r,
                state,
                this.organism.anatomy.addDefaultCell(state, loc_c, loc_r)
            );
        }
    }

    removeCellFromOrg(c, r) {
        const center = this.grid_map.getCenter();
        const loc_c = c - center[0];
        const loc_r = r - center[1];
        if (loc_c == 0 && loc_r == 0) {
            alert("Cannot remove center cell");
            return;
        }
        const prev_cell = this.organism.anatomy.getLocalCell(loc_c, loc_r);
        if (prev_cell != null) {
            if (this.organism.anatomy.removeCell(loc_c, loc_r)) {
                this.changeCell(c, r, CellStates.empty, null);
            }
        }
    }

    setOrganismToCopyOf(orig_org) {
        this.grid_map.fillGrid(CellStates.empty);
        const center = this.grid_map.getCenter();
        this.organism = new Organism(center[0], center[1], this, orig_org);
        this.organism.updateGrid();
        this.controller.updateDetails();
    }

    getCopyOfOrg() {
        const new_org = new Organism(0, 0, null, this.organism);
        return new_org;
    }

    clear() {
        this.grid_map.fillGrid(CellStates.empty);
        const center = this.grid_map.getCenter();
        this.organism = new Organism(center[0], center[1], this, null);
        this.organism.anatomy.addDefaultCell(CellStates.mouth, 0, 0);
        this.organism.updateGrid();
    }

    createRandom() {
        this.grid_map.fillGrid(CellStates.empty);

        this.organism = RandomOrganismGenerator.generate(this);
        this.organism.updateGrid();
    }

    resetWithRandomOrgs(env) {
        const reset_confirmed = env.reset(true, false);
        if (!reset_confirmed) return;
        const numOrganisms = parseInt($("#num-random-orgs").val());

        const size = Math.ceil(8);

        for (let i = 0; i < numOrganisms; i++) {
            const newOrganism = RandomOrganismGenerator.generate(this);
            const col = Math.floor(
                size + Math.random() * (env.grid_map.cols - size * 2)
            );
            const row = Math.floor(
                size + Math.random() * (env.grid_map.rows - size * 2)
            );
            env.controller.dropOrganism(newOrganism, col, row);
        }
    }
}

module.exports = OrganismEditor;
