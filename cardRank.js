const { shuffle } = require("fast-shuffle");
const yaml = require("js-yaml");
const fs = require("fs");

const readline = require("readline");

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

let comparisons = 0;
const log = false;
const ask = false;

class Node {
  constructor(val) {
    this.val = val;
    this.o = new Set();
    this.i = new Set();
  }

  toString() {
    return `Node(val=${this.val}, o=${printNodeSet(this.o)}, i=${printNodeSet(
      this.i
    )})`;
  }
}

const printNodeSet = (s) => {
  return Array.from(s).map((s) => s.val);
};

const compare = async (nodeA, nodeB, indexMap) => {
  if (log) console.log(`Comparison: ${nodeA} vs ${nodeB}`);
  comparisons++;

  let word1 = nodeA.val;
  if (word1.includes("/")) {
    word1 = shuffle(word1.split("/"))[0];
  }
  let word2 = nodeB.val;
  if (word2.includes("/")) {
    word2 = shuffle(word2.split("/"))[0];
  }

  if (ask) {
    const ans = await askQuestion(
      `Which is more important to you - ${word1} (1) or ${word2} (2)? `
    );
    return ans === "1";
  } else {
    return indexMap[nodeA.val] < indexMap[nodeB.val];
  }
};

const topSort = (nodes) => {
  nodes.forEach((node) => {
    node.i3 = new Set(Array.from(node.i));
    node.o3 = new Set(Array.from(node.o));
  });

  const topSorted = [];
  const topSortedSet = new Set();
  while (topSortedSet.size < nodes.length) {
    nodes.forEach((node) => {
      node.i2 = new Set(Array.from(node.i3));
      node.o2 = new Set(Array.from(node.o3));
    });
    topSorted.push([]);
    nodes.forEach((node) => {
      if (topSortedSet.has(node)) {
        return;
      }
      if (node.i2.size === 0) {
        topSorted[topSorted.length - 1].push(node);
        topSortedSet.add(node);
        node.o3.forEach((out) => {
          out.i3.delete(node);
        });
      }
    });
  }

  nodes.forEach((node) => {
    node.i2 = null;
    node.o2 = null;
    node.i3 = null;
    node.o3 = null;
  });

  return topSorted;
};

const formatList = (topSorted) => {
  return topSorted.map((x) => x.map((y) => y.val).join(","));
};

const pairRankNodes = async (nodes) => {
  const len = nodes.length;
  const shuffled = shuffle(nodes);

  for (let i = 0; i < len; i += 2) {
    if (i + 1 >= len) {
      break;
    }
    const first = shuffled[i];
    const second = shuffled[i + 1];
    await handleComparison(first, second, indexMap);
  }
};

const hasSplitAt = (splitNum, topSorted) => {
  seenCount = 0;
  for (group of topSorted) {
    seenCount += group.length;
    if (seenCount === splitNum) {
      return true;
    } else if (seenCount > splitNum) {
      return false;
    }
  }
};

const handleComparison = async (first, second, indexMap) => {
  if (await compare(first, second, indexMap)) {
    first.o.add(second);
    second.i.add(first);
  } else {
    first.i.add(second);
    second.o.add(first);
  }
};

const buildIndexMap = (vals) => {
  const indexMap = {};
  actualOrder.forEach((v, i) => {
    indexMap[v] = i;
  });
  return indexMap;
};

const sortFirstPair = async (topSorted) => {
  for (let rank of topSorted) {
    if (rank.length < 2) {
      continue;
    }
    const [first, second] = rank;
    await handleComparison(first, second, indexMap);
    break;
  }
  if (log) console.log(formatList(topSorted));
}

const handleFullSort = async (nodes, topSorted, indexMap) => {
  while (topSorted.length < nodes.length) {
    topSorted = shuffle(topSorted);
    await sortFirstPair(topSorted);
    topSorted = topSort(nodes);
  }
  return topSorted;
};

const handleOrderedPartialSort = async (nodes, topSorted, indexMap) => {
  let hasSortedTopN = false;
  while (!hasSortedTopN) {
    sortFirstPair(topSorted);
    topSorted = topSort(nodes);
    hasSortedTopN = topSorted
      .filter((v, i) => i < findTop)
      .every((x) => x.length === 1);
  }

  return topSorted;
};

const handleUnorderedPartialSort = async (nodes, topSorted, indexMap) => {
  let hasIdentifiedTopN = false;
  while (!hasIdentifiedTopN) {
    let seenCount = 0;
    for (let rank of topSorted) {
      seenCount += rank.length;
      if (rank.length < 2 || seenCount < findTop) {
        continue;
      }
      const [first, second] = rank;
      await handleComparison(first, second, indexMap);
      break;
    }
    if (log) console.log(formatList(topSorted));

    topSorted = topSort(nodes);
    hasIdentifiedTopN = hasSplitAt(findTop, topSorted);
  }
};

const cardRank = async (values, findTop = null, findTopOrdered = true) => {
  const indexMap = buildIndexMap(values);

  let nodes = values.map((val) => new Node(val));

  await pairRankNodes(nodes);

  let topSorted = topSort(nodes);

  if (findTop === null) {
    // Full sort
    await handleFullSort(nodes, topSorted, indexMap);
  } else if (findTopOrdered) {
    // Find top N, ordered
    await handleOrderedPartialSort(nodes, topSorted, indexMap, findTop);
  } else {
    // Find top N, unordered
    await handleUnorderedPartialSort(nodes, topSorted, indexMap, findTop);
  }

  if (findTop === null) {
    return formatList(topSorted);
  } else {
    return formatList(topSorted).filter((v, i) => i < findTop);
  }
};

const { values } = yaml.load(fs.readFileSync("./values.yaml"));
cardRank(
  values.filter((v, i) => i < 10),
  3,
  false
).then((res) => {
  console.log(res);
  console.log(`Comps: ${comparisons}`);
});

/**
 * An idea: whittle down to the top 10 values,
 * then cut these down further to the top 3.
 */

/**
 * Another idea: allow synonymous values separated with slashes, and alternate between synonyms
 */

/**
 * Could be cool to show a graph illustrating the choices that were made and the ordering outcomes they resulted in.
 */
