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
const ask = true;

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
  if (word1.includes('/')) {
    word1 = shuffle(word1.split('/'))[0];
  }
  let word2 = nodeB.val;
  if (word2.includes('/')) {
    word2 = shuffle(word2.split('/'))[0];
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

const cardRank = async (actualOrder, findTop = null, findTopOrdered = true) => {
  indexMap = {};
  actualOrder.forEach((v, i) => {
    indexMap[v] = i;
  });

  let nodes = actualOrder.map((val) => new Node(val));

  nodes = shuffle(nodes);
  for (let i = 0; i < nodes.length; i += 2) {
    if (i + 1 >= nodes.length) {
      break;
    }
    const first = nodes[i];
    const second = nodes[i + 1];
    if (await compare(first, second, indexMap)) {
      first.o.add(second);
      second.i.add(first);
    } else {
      first.i.add(second);
      second.o.add(first);
    }
  }

  let topSorted = topSort(nodes);

  let hasSortedTopN = false;
  let hasIdentifiedTopN = false;
  while (
    (findTop === null && topSorted.length < nodes.length) ||
    (findTop !== null && findTopOrdered && !hasSortedTopN) ||
    (findTop !== null && !findTopOrdered && !hasIdentifiedTopN)
  ) {
    if (findTop === null) {
      topSorted = shuffle(topSorted);
    }
    let seenCount = 0;
    for (let rank of topSorted) {
      seenCount += rank.length;
      if (rank.length < 2) {
        continue;
      }
      if (!findTopOrdered && seenCount < findTop) {
        continue;
      }
      const [first, second] = rank;
      if (await compare(first, second, indexMap)) {
        first.o.add(second);
        second.i.add(first);
      } else {
        first.i.add(second);
        second.o.add(first);
      }
      break;
    }
    if (log) console.log(formatList(topSorted));
    topSorted = topSort(nodes);
    hasSortedTopN = topSorted
      .filter((v, i) => i < findTop)
      .every((x) => x.length === 1);

    hasIdentifiedTopN = false;
    seenCount = 0;
    for (let i=0; i<topSorted.length; i++) {
      seenCount += topSorted[i].length;
      if (seenCount === findTop) {
        hasIdentifiedTopN = true;
        break;
      }
    }
  }

  if (findTop === null) {
    return formatList(topSorted);
  } else {
    return formatList(topSorted).filter((v, i) => i < findTop);
  }
};

const { values } = yaml.load(fs.readFileSync("./values.yaml"));
cardRank(values.filter((v, i) => i < 10), 3, false).then((res) => {
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