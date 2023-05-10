const CellStates = require("./Cell/CellStates");
const Organism = require("./Organism");

class RandomOrganismGenerator {
    static generate(env) {
        const center = env.grid_map.getCenter();
        const organism = new Organism(center[0], center[1], env, null);
        organism.anatomy.addDefaultCell(CellStates.mouth, 0, 0);

        const outermostLayer = RandomOrganismGenerator.organismLayers;
        let x, y;

        // iterate from center to edge of organism
        // layer 0 is the central cell of the organism
        for (let layer = 1; layer <= outermostLayer; layer++) {
            let someCellSpawned = false;
            const spawnChance =
                RandomOrganismGenerator.cellSpawnChance * 1 -
                (layer - 1) / outermostLayer;

            // top
            y = -layer;
            for (x = -layer; x <= layer; x++)
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(
                    organism,
                    x,
                    y,
                    spawnChance
                );

            // bottom
            y = layer;
            for (x = -layer; x <= layer; x++)
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(
                    organism,
                    x,
                    y,
                    spawnChance
                );

            // left
            x = -layer;
            for (y = -layer + 1; y <= layer - 1; y++)
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(
                    organism,
                    x,
                    y,
                    spawnChance
                );

            // right
            x = layer;
            for (y = -layer + 1; y < layer - 1; y++)
                someCellSpawned = RandomOrganismGenerator.trySpawnCell(
                    organism,
                    x,
                    y,
                    spawnChance
                );

            if (!someCellSpawned) break;
        }

        // randomize the organism's brain
        organism.brain.randomizeDecisions(true);

        return organism;
    }

    static trySpawnCell(organism, x, y, spawnChance) {
        const neighbors = organism.anatomy.getNeighborsOfCell(x, y);
        if (neighbors.length && Math.random() < spawnChance) {
            organism.anatomy.addRandomizedCell(
                CellStates.getRandomLivingType(),
                x,
                y
            );
            return true;
        }
        return false;
    }
}

RandomOrganismGenerator.organismLayers = 4;
RandomOrganismGenerator.cellSpawnChance = 0.75;

module.exports = RandomOrganismGenerator;
