const CellStates = require("../Organism/Cell/CellStates");
const SerializeHelper = require("../Utils/SerializeHelper");
const Species = require("./Species");

const cellNaming = new Map([
    [CellStates.producer, "p"],
    [CellStates.mouth, "o"],
    [CellStates.mover, "m"],
    [CellStates.eye, "e"],
    [CellStates.killer, "k"],
    [CellStates.armor, "a"],
]);

const FossilRecord = {
    init: function () {
        this.largest_species_ever = null;
        this.largest_extant_species = null;
        this.extant_species = {};
        this.extinct_species = {};
        this.record_size_limit = 500; // store this many data points
    },

    setEnv: function (env) {
        this.env = env;
        this.setData();
    },

    registerOrganismSpecies: function (organism, start_tick) {
        const {
            anatomy: { grid: cell_grid },
        } = organism;

        const name = Object.keys(cell_grid)
            .sort()
            .map((xy) => `${cellNaming.get(cell_grid[xy].state)}[${xy}]`)
            .join("");

        if (name in this.extinct_species) {
            this.resurrect(this.extinct_species[name], organism, start_tick);
        }
        if (name in this.extant_species) {
            const species = this.extant_species[name];
            organism.species = species;
            species.addPop();
            return species;
        }

        const species = new Species(
            name,
            organism.anatomy,
            organism,
            start_tick
        );
        this.register(species);
        organism.species = species;
        return species;
    },

    registerDeath: function (species) {
        species.decreasePop();
        if (species.extinct) {
            this.fossilize(species);
        }
    },

    numExtantSpecies() {
        return Object.values(this.extant_species).length;
    },

    numExtinctSpecies() {
        return Object.values(this.extinct_species).length;
    },

    sizeOfLargestSpeciesEver() {
        return this.largest_species_ever?.anatomy.cells.length ?? 0;
    },

    sizeOfLargestExtantSpecies() {
        return this.largest_extant_species?.anatomy.cells.length ?? 0;
    },

    register: function (species) {
        this.extant_species[species.name] = species;
        const size = species.anatomy.cells.length;
        if (size > (this.largest_extant_species?.anatomy.cells.length ?? 0)) {
            this.largest_extant_species = species;
            if (size > (this.largest_species_ever?.anatomy.cells.length ?? 0)) {
                this.largest_species_ever = species;
            }
        }
    },
    fossilize: function (species) {
        if (!(species.name in this.extant_species)) {
            console.warn(
                "Tried to fossilize unregistered species:",
                species.name
            );
            return;
        }
        species.end_tick = this.env.total_ticks;
        species.ancestor = undefined; // garbage collect ancestors
        delete this.extant_species[species.name];
        this.extinct_species[species.name] = species;
        if (species === this.largest_extant_species) {
            // recompute largest live species
            this.largest_extant_species = this.getLargestExtant();
        }
    },

    getLargestExtant() {
        const species = Object.values(this.extant_species);
        if (species.length === 0) return null;
        return species.reduce((largest, sp) =>
            largest.anatomy.cells.length > sp.anatomy.cells.length
                ? largest
                : sp
        );
    },

    resurrect: function (species, new_ancestor) {
        if (!species.extinct) {
            console.warn("Tried to resurrect extant species:", species.name);
            return;
        }
        if (!(species.name in this.extinct_species)) {
            console.warn(
                "Tried to resurrect unregistered species:",
                species.name
            );
            return;
        }
        species.ancestor = new_ancestor;
        delete this.extinct_species[species.name];
        this.register(species);
    },

    setData() {
        // all parallel arrays
        this.tick_record = [];
        this.pop_counts = [];
        this.species_counts = [];
        this.av_mut_rates = [];
        this.av_cell_counts = [];
        this.updateData();
    },

    updateData() {
        const tick = this.env.total_ticks;
        this.tick_record.push(tick);
        this.pop_counts.push(this.env.organisms.length);
        this.species_counts.push(this.numExtantSpecies());
        this.av_mut_rates.push(this.env.averageMutability());
        this.calcCellCountAverages();
        while (this.tick_record.length > this.record_size_limit) {
            this.tick_record.shift();
            this.pop_counts.shift();
            this.species_counts.shift();
            this.av_mut_rates.shift();
            this.av_cell_counts.shift();
        }
    },

    calcCellCountAverages() {
        let total_org = 0;
        const cell_counts = {};
        for (const c of CellStates.living) {
            cell_counts[c.name] = 0;
        }
        for (const s of Object.values(this.extant_species)) {
            for (const name in s.cell_counts) {
                cell_counts[name] += s.cell_counts[name] * s.population;
            }
            total_org += s.population;
        }
        if (total_org === 0) {
            this.av_cell_counts.push(cell_counts);
            return;
        }

        // let total_cells = 0;
        for (const c in cell_counts) {
            // total_cells += cell_counts[c];
            cell_counts[c] /= total_org;
        }
        this.av_cell_counts.push(cell_counts);
    },

    clear_record() {
        this.extant_species = [];
        this.extinct_species = [];
        this.setData();
    },

    serialize() {
        this.updateData();
        const record = SerializeHelper.copyNonObjects(this);
        record.records = {
            tick_record: this.tick_record,
            pop_counts: this.pop_counts,
            species_counts: this.species_counts,
            av_mut_rates: this.av_mut_rates,
            av_cells: this.av_cells,
            av_cell_counts: this.av_cell_counts,
        };
        const species = {};
        for (const s of Object.values(this.extant_species)) {
            species[s.name] = SerializeHelper.copyNonObjects(s);
            delete species[s.name].name; // the name will be used as the key, so remove it from the value
        }
        record.species = species;
        return record;
    },

    loadRaw(record) {
        for (const name in record.species) {
            const s = new Species(name, null, null, 0);
            SerializeHelper.overwriteNonObjects(record.species[name], s);
            (s.extinct ? this.extinct_species : this.extant_species)[name] = s;
        }
        SerializeHelper.overwriteNonObjects(record, this);

        for (const key in record.records) {
            this[key] = record.records[key];
        }
    },

    loadSpeciesFromOrgAnatomy(species_name, anatomy) {
        let species =
            this.extinct_species[species_name] ??
            this.extant_species[species_name];

        if (!species) {
            species = new Species(species_name, anatomy, null, 0);
            this.register(species);
            return species;
        }
        species.anatomy = anatomy;
        species.calcAnatomyDetails();
        return species;
    },
};

FossilRecord.init();

module.exports = FossilRecord;
