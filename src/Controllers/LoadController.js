const LoadController = {
    init() {
        $("#close-load-btn").click(() => {
            this.close();
        });
        $("#load-custom-btn").click(() => {
            $("#upload-json").click();
        });
        $("#community-creations-btn").click(() => {
            this.open();
        });
        $("#load-env-btn").click(async () => {
            const file = $("#worlds-load-dropdown").val();
            const base = `./assets/worlds/`;
            const resp = await fetch(base + file + ".json");
            const json = await resp.json();
            this.control_panel.loadEnv(json);
            this.close();
        });
        $("#load-org-btn").click(async () => {
            const file = $("#organisms-load-dropdown").val();
            const base = `./assets/organisms/`;
            const resp = await fetch(base + file + ".json");
            const json = await resp.json();
            this.control_panel.editor_controller.loadOrg(json);
            this.close();
            $("#maximize").click();
            $("#editor").click();
        });

        this.loadDropdown("worlds");
        this.loadDropdown("organisms");
    },

    async loadDropdown(name) {
        const base = `./assets/${name}/`;

        let list = [];
        try {
            const resp = await fetch(base + "_list.json");
            list = await resp.json();
        } catch (e) {
            console.error("Failed to load list: ", e);
        }

        const id = `#${name}-load-dropdown`;
        $(id).empty();
        for (const opt of list) {
            $(id).append(
                `<option value="${opt.file}">
                ${opt.name}
                </option>`
            );
        }
    },

    async open() {
        $(".load-panel").css("display", "block");
    },

    loadJson(callback) {
        $("#upload-json").change((e) => {
            const files = e.target.files;
            if (!files.length) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    callback(json);
                    this.close();
                } catch (e) {
                    console.error(e);
                    alert("Failed to load");
                }
                $("#upload-json")[0].value = "";
            };
            reader.readAsText(files[0]);
        });
        $("#upload-json").click();
    },

    close() {
        $(".load-panel").css("display", "none");
        $("#load-selected-btn").off("click");
        $("#upload-json").off("change");
    },
};

$(document).ready(() => {
    LoadController.init();
});

module.exports = LoadController;
