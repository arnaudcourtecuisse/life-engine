const CanvasController = require("./CanvasController");
const Modes = require("./ControlModes");
const CellStates = require("../Organism/Cell/CellStates");
const Directions = require("../Organism/Directions");
const Hyperparams = require("../Hyperparameters");
const LoadController = require("./LoadController");

class EditorController extends CanvasController {
    constructor(env, canvas) {
        super(env, canvas);
        this.mode = Modes.None;
        this.edit_cell_type = null;
        this.highlight_org = false;
        this.defineCellTypeSelection();
        this.defineEditorDetails();
        this.defineSaveLoad();
    }

    mouseMove() {
        if (["left", "right"].includes(this.active_button)) this.editOrganism();
    }

    mouseDown() {
        this.editOrganism();
    }

    mouseUp() {}

    getCurLocalCell() {
        return this.env.organism.anatomy.getLocalCell(
            this.mouse_c - this.env.organism.c,
            this.mouse_r - this.env.organism.r
        );
    }

    editOrganism() {
        if (this.edit_cell_type == null || this.mode !== Modes.Edit) return;

        if (this.active_button === "left") {
            this.updateCell();
        } else if (this.active_button === "right") {
            this.env.removeCellFromOrg(this.mouse_c, this.mouse_r);
        }

        this.setBrainPanelVisibility();
        this.setMoveRangeVisibility();
        this.updateDetails();
    }

    updateCell() {
        const shouldRotate =
            this.edit_cell_type === CellStates.eye &&
            this.cur_cell.state === CellStates.eye;

        if (shouldRotate) {
            const loc_cell = this.getCurLocalCell();
            loc_cell.direction = Directions.rotateRight(loc_cell.direction);
            return this.env.renderFull();
        }

        return this.env.addCellToOrg(
            this.mouse_c,
            this.mouse_r,
            this.edit_cell_type
        );
    }

    updateDetails() {
        $(".cell-count").text(
            "Cell count: " + this.env.organism.anatomy.cells.length
        );
    }

    typesIdMap = {
        mouth: CellStates.mouth,
        producer: CellStates.producer,
        mover: CellStates.mover,
        killer: CellStates.killer,
        armor: CellStates.armor,
        eye: CellStates.eye,
    };

    defineCellTypeSelection() {
        const self = this;
        $(".cell-type").on("click", function () {
            const updatedState = self.typesIdMap[this.id];
            if (updatedState) {
                self.edit_cell_type = updatedState;
            }

            // Highlight only selected cell type
            $(".cell-type").css("border-color", "black");
            const selected = "#" + this.id + ".cell-type";
            $(selected).css("border-color", "yellow");
        });
    }

    defineEditorDetails() {
        $("#move-decision-interval-edit").on("change", () => {
            this.env.organism.move_decision_interval = parseInt(
                $("#move-decision-interval-edit").val()
            );
        });

        $("#mutation-rate-edit").on("change", () => {
            this.env.organism.mutability = parseInt(
                $("#mutation-rate-edit").val()
            );
        });

        $("#observation-type-edit").on("change", () => {
            // Load the reaction value for the selected observation type
            this.updatedBrainReactionForm();
        });
        $("#reaction-edit").on("change", () => {
            // Save the reaction value for the selected observation type
            const obs = $("#observation-type-edit").val();
            this.env.organism.brain.decisions[obs] = parseInt(
                $("#reaction-edit").val(),
                10
            );
            this.updateBrainBehavior();
        });
    }

    defineSaveLoad() {
        $("#save-org").on("click", () => {
            const org = this.env.organism.serialize();
            const data =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(org));
            const downloadEl = document.getElementById("download-el");
            downloadEl.setAttribute("href", data);
            downloadEl.setAttribute("download", "organism.json");
            downloadEl.click();
        });
        $("#load-org").on("click", () => {
            LoadController.loadJson((org) => {
                this.loadOrg(org);
            });
        });
    }

    loadOrg(org) {
        this.env.clear();
        this.env.organism.loadRaw(org);
        this.refreshDetailsPanel();
        this.env.organism.updateGrid();
        this.env.renderFull();
        if (this.mode === Modes.Clone) $("#drop-org").trigger("click");
    }

    clearDetailsPanel() {
        $("#organism-details").css("display", "none");
        $("#edit-organism-details").css("display", "none");
        $("#randomize-organism-details").css("display", "none");
    }

    refreshDetailsPanel() {
        if (this.mode === Modes.Edit) this.setEditorPanel();
        else this.setDetailsPanel();
    }

    setDetailsPanel() {
        this.clearDetailsPanel();
        const org = this.env.organism;

        $(".cell-count").text("Cell count: " + org.anatomy.cells.length);
        $("#move-decision-interval").text(
            "Move Range: " + org.move_decision_interval
        );
        $("#mutation-rate").text("Mutation Rate: " + org.mutability);

        if (Hyperparams.useEvolutiveMutability) {
            $("#mutation-rate").css("display", "block");
        } else {
            $("#mutation-rate").css("display", "none");
        }

        this.setMoveRangeVisibility();

        if (this.setBrainPanelVisibility()) {
            this.updateBrainBehavior();
        }
        $("#organism-details").css("display", "block");
    }

    setEditorPanel() {
        this.clearDetailsPanel();
        const org = this.env.organism;

        $(".cell-count").text("Cell count: " + org.anatomy.cells.length);
        if (this.setMoveRangeVisibility()) {
            $("#move-decision-interval-edit").val(org.move_decision_interval);
        }

        $("#mutation-rate-edit").val(org.mutability);
        $("#mutation-rate-cont").css(
            "display",
            Hyperparams.useEvolutiveMutability ? "block" : "none"
        );

        if (this.setBrainPanelVisibility()) {
            this.updatedBrainReactionForm();
            this.updateBrainBehavior();
        }

        $("#cell-selections").css("display", "grid");
        $("#edit-organism-details").css("display", "block");
    }

    setMoveRangeVisibility() {
        const org = this.env.organism;
        const display = org.anatomy.is_mover ? "block" : "none";
        $("#move-decision-interval-cont").css("display", display);
        $("#move-decision-interval").css("display", display);
        return org.anatomy.is_mover;
    }

    setBrainPanelVisibility() {
        const org = this.env.organism;
        const has_brain = org.anatomy.has_eyes && org.anatomy.is_mover;
        const display = has_brain ? "block" : "none";
        $(".brain-details").css("display", display);
        return has_brain;
    }

    updateBrainBehavior() {
        const chase_types = [];
        const retreat_types = [];
        for (const cell_name in this.env.organism.brain.decisions) {
            const decision = this.env.organism.brain.decisions[cell_name];
            if (decision === 1) {
                retreat_types.push(cell_name);
            } else if (decision === 2) {
                chase_types.push(cell_name);
            }
        }
        $(".chase-types").text("Move Towards: " + chase_types);
        $(".retreat-types").text("Move Away From: " + retreat_types);
    }

    updatedBrainReactionForm() {
        const name = $("#observation-type-edit").val();
        const reaction = this.env.organism.brain.decisions[name];
        $("#reaction-edit").val(reaction);
    }
}

module.exports = EditorController;
