class CanvasController {
    constructor(env, canvas) {
        this.env = env;
        this.canvas = canvas;
        this.mouse_x;
        this.mouse_y;
        this.mouse_c;
        this.mouse_r;

        this.active_button = null;

        this.cur_cell = null;
        this.cur_org = null;
        this.highlight_org = true;
        this.defineEvents();
    }

    setControlPanel(panel) {
        this.control_panel = panel;
    }

    defineEvents() {
        this.canvas.addEventListener("mousemove", (e) => {
            this.updateMouseLocation(e.offsetX, e.offsetY);
            this.mouseMove();
        });

        const buttonIds = ["left", "middle", "right"];

        this.canvas.addEventListener("mouseup", (evt) => {
            evt.preventDefault();
            this.updateMouseLocation(evt.offsetX, evt.offsetY);
            this.mouseUp();
            const button = buttonIds[evt.button];
            if (this.active_button === button) {
                this.active_button = null;
            }
        });

        this.canvas.addEventListener("mousedown", (evt) => {
            evt.preventDefault();
            this.updateMouseLocation(evt.offsetX, evt.offsetY);
            this.active_button = buttonIds[evt.button];
            this.mouseDown();
        });

        this.canvas.addEventListener("contextmenu", function (evt) {
            evt.preventDefault();
        });

        this.canvas.addEventListener(
            "mouseleave",
            function () {
                this.active_button = null;
                this.env.renderer.clearAllHighlights(true);
            }.bind(this)
        );

        this.canvas.addEventListener(
            "mouseenter",
            function (evt) {
                if ((evt.buttons & 1) !== 0) {
                    this.active_button = "left";
                } else if ((evt.buttons & 2) !== 0) {
                    this.active_button = "right";
                } else if ((evt.buttons & 4) !== 0) {
                    this.active_button = "middle";
                }

                this.updateMouseLocation(evt.offsetX, evt.offsetY);
                this.start_x = this.mouse_x;
                this.start_y = this.mouse_y;
            }.bind(this)
        );
    }

    updateMouseLocation(offsetX, offsetY) {
        const prev_cell = this.cur_cell;
        const prev_org = this.cur_org;

        this.mouse_x = offsetX;
        this.mouse_y = offsetY;
        const colRow = this.env.grid_map.xyToColRow(this.mouse_x, this.mouse_y);
        this.mouse_c = colRow[0];
        this.mouse_r = colRow[1];
        this.cur_cell = this.env.grid_map.cellAt(this.mouse_c, this.mouse_r);
        this.cur_org = this.cur_cell.owner;

        if (this.cur_org != prev_org || this.cur_cell != prev_cell) {
            this.env.renderer.clearAllHighlights(true);
            if (this.cur_org != null && this.highlight_org) {
                this.env.renderer.highlightOrganism(this.cur_org);
            } else if (this.cur_cell != null) {
                this.env.renderer.highlightCell(this.cur_cell, true);
            }
        }
    }

    mouseMove() {
        alert("mouse move must be overridden");
    }

    mouseDown() {
        alert("mouse down must be overridden");
    }

    mouseUp() {
        alert("mouse up must be overridden");
    }
}

module.exports = CanvasController;
