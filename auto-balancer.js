const goalList = require('./goal-list');
const Pool = require('threads').Pool;
const fs = require('fs');

let bestStdDev = Infinity;

async function go() {
	let num = 0;
	for (;;) {
		num++;
		let totalIterations = 0;
		const goalResults = new Map();

		const pool = new Pool(4);
		pool.run((input, done) => {
			generator = require(input.__dirname + '/generator');
			const INDICES_PER_ROW = {
				"row1": [1, 2, 3, 4, 5],
				"row2": [6, 7, 8, 9, 10],
				"row3": [11, 12, 13, 14, 15],
				"row4": [16, 17, 18, 19, 20],
				"row5": [21, 22, 23, 24, 25],
				"col1": [1, 6, 11, 16, 21],
				"col2": [2, 7, 12, 17, 22],
				"col3": [3, 8, 13, 18, 23],
				"col4": [4, 9, 14, 19, 24],
				"col5": [5, 10, 15, 20, 25],
				"tlbr": [1, 7, 13, 19, 25],
				"bltr": [5, 9, 13, 17, 21]
			};

			const board = generator(input.goalList.normal);
			const rows = {};
			Object.keys(INDICES_PER_ROW).forEach(key => rows[key] = INDICES_PER_ROW[key].map(n => board[n].id));
			done({ rows, iterations: board.meta.iterations });
		}, {
			generator: './generator',
		});
		console.time('asdf');
		await Promise.all((function*() {
			for (let i = 0; i < 1000; i++) {
				yield pool.send({ goalList, __dirname }).promise().then(({ rows, iterations }) => {
					totalIterations += iterations;
					Object.values(rows).forEach(row => row.forEach(goal => {
						if (!goalResults.has(goal)) {
							goalResults.set(goal, 0);
						}
						goalResults.set(goal, goalResults.get(goal) + 1);
					}));
				});
			}
		})());
		console.timeEnd('asdf');
		const result = byDiff(sort(goalResults));
		let avgStdDev = 0;
		Object.values(result).forEach(goalResults => {
			const totalFreq = goalResults.reduce((sum, x) => sum + x[1], 0);
			const avgFreq = totalFreq / goalResults.length;
			let stdDev = Math.sqrt((goalResults.reduce((sum, x) => sum + (x[1] - avgFreq) ** 2, 0)) / (goalResults.length - 1));
			avgStdDev += stdDev;
		});
		fs.writeFileSync('data.json', JSON.stringify(result));

		avgStdDev /= Object.values(result).length;
		goalList.normal.averageStandardDeviation = avgStdDev;

		if (avgStdDev < bestStdDev) {
			console.log('new best!');
			bestStdDev = avgStdDev;
			fs.writeFileSync('best-goals.json', JSON.stringify(goalList));
		}
		fs.writeFileSync('new-goals.json', JSON.stringify(goalList));
		console.log(`iteration #${num}: iterations : ${totalIterations / 1000} stdDev = ${avgStdDev}, best = ${bestStdDev}`);

		Object.values(result).forEach(goalResults => {
			goals[goalResults[0][0]].weight -= 0.1;
			goals[goalResults[1][0]].weight -= 0.05;
			goals[goalResults[goalResults.length - 2][0]].weight += 0.05;
			goals[goalResults[goalResults.length - 1][0]].weight += 0.1;
		});

	}
}

const goals = {}
Object.keys(goalList.normal).forEach(key => {
	if (Array.isArray(goalList.normal[key])) {
		goalList.normal[key].forEach(goal => {
			goal.weight = goal.weight || 0;
			goals[goal.id] = goal;
		})
	}
});

function byDiff(arr) {
	ret = {}
	arr.forEach(e => {
		if (!ret[goals[e[0]].difficulty]) {
			ret[goals[e[0]].difficulty] = []
		}
		ret[goals[e[0]].difficulty].push(e)
	});
	return ret;
}

const sort = r => [...r.entries()].sort(([a1, n1], [a2, n2]) => n2 - n1);

module.exports = go;
go();
