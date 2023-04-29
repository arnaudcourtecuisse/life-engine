module.exports = {
    random: Math.random,
    randomInt(max, min = 0) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return min + Math.floor((max - min) * this.random());
    },
    randomChance(probability, attempts = 1) {
        return (
            100 * this.random() < probability ||
            (attempts > 1 && this.randomChance(probability, attempts - 1))
        );
    },
    randomPick(array) {
        const index = this.randomInt(array.length);
        return array[index];
    },
};
