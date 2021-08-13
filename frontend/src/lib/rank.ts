import { shuffle } from "fast-shuffle";
import yaml from "js-yaml";
import fs from "fs";

let comparisons = 0;
const log = true;
const ask = false;

class Node {
  val: string;
  o: Set<Node>;
  i: Set<Node>;

  // Temp
  o2?: Set<Node>;
  i2?: Set<Node>;
  o3?: Set<Node>;
  i3?: Set<Node>;

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

const printNodeSet = (s: Set<Node>) => {
  return Array.from(s).map((s) => s.val);
};

const compare = async (nodeA: Node, nodeB: Node) => {
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

  // if (ask) {
  //   const ans = await askQuestion(
  //     `Which is more important to you - ${word1} (1) or ${word2} (2)? `
  //   );
  //   return ans === "1";
  // } else {
  return true;
  // }
};

const topSort = (nodes: Node[]) => {
  nodes.forEach((node: Node) => {
    node.i3 = new Set(Array.from(node.i));
    node.o3 = new Set(Array.from(node.o));
  });

  const topSorted: Node[][] = [];
  const topSortedSet = new Set();
  while (topSortedSet.size < nodes.length) {
    nodes.forEach((node: Node) => {
      node.i2 = new Set(node.i3 ? Array.from(node.i3) : []);
      node.o2 = new Set(node.o3 ? Array.from(node.o3) : []);
    });
    topSorted.push([]);
    nodes.forEach((node: Node) => {
      if (topSortedSet.has(node)) {
        return;
      }
      if (node.i2 && node.i2.size === 0) {
        topSorted[topSorted.length - 1].push(node);
        topSortedSet.add(node);
        (node.o3 || new Set()).forEach((out) => {
          (out.i3 || new Set()).delete(node);
        });
      }
    });
  }

  nodes.forEach((node: Node) => {
    delete node.i2;
    delete node.o2;
    delete node.i3;
    delete node.o3;
  });

  return topSorted;
};

const formatList = (topSorted: Node[][]) => {
  return topSorted.map((x) => x.map((y) => y.val).join(","));
};

const pairRankNodes = async (nodes: Node[]) => {
  const len = nodes.length;
  const shuffled = shuffle(nodes);

  for (let i = 0; i < len; i += 2) {
    if (i + 1 >= len) {
      break;
    }
    const first = shuffled[i];
    const second = shuffled[i + 1];
    await handleComparison(first, second);
  }
};

const hasSplitAt = (splitNum: number, topSorted: Node[][]) => {
  let seenCount = 0;
  for (let group of topSorted) {
    seenCount += group.length;
    if (seenCount === splitNum) {
      return true;
    } else if (seenCount > splitNum) {
      return false;
    }
  }
  return false;
};

const handleComparison = async (first: Node, second: Node) => {
  if (await compare(first, second)) {
    first.o.add(second);
    second.i.add(first);
  } else {
    first.i.add(second);
    second.o.add(first);
  }
};

const sortFirstPair = async (topSorted: Node[][]) => {
  for (let rank of topSorted) {
    if (rank.length < 2) {
      continue;
    }
    const [first, second] = rank;
    await handleComparison(first, second);
    break;
  }
  if (log) console.log(formatList(topSorted));
};

const handleFullSort = async (nodes: Node[], topSorted: Node[][]) => {
  while (topSorted.length < nodes.length) {
    topSorted = shuffle(topSorted);
    await sortFirstPair(topSorted);
    topSorted = topSort(nodes);
  }
  return topSorted;
};

const handleOrderedPartialSort = async (
  nodes: Node[],
  topSorted: Node[][],
  findTop: number
) => {
  let hasSortedTopN = false;
  while (!hasSortedTopN) {
    await sortFirstPair(topSorted);
    topSorted = topSort(nodes);
    hasSortedTopN = topSorted
      .filter((v, i) => i < findTop)
      .every((x) => x.length === 1);
  }

  return topSorted;
};

const handleUnorderedPartialSort = async (
  nodes: Node[],
  topSorted: Node[][],
  findTop: number
) => {
  let hasIdentifiedTopN = false;
  while (!hasIdentifiedTopN) {
    let seenCount = 0;
    for (let rank of topSorted) {
      seenCount += rank.length;
      if (rank.length < 2 || seenCount < findTop) {
        continue;
      }
      const [first, second] = rank;
      await handleComparison(first, second);
      break;
    }
    if (log) console.log(formatList(topSorted));

    topSorted = topSort(nodes);
    hasIdentifiedTopN = hasSplitAt(findTop, topSorted);
  }

  return topSorted;
};

const cardRankHelper = async (
  nodes: Node[],
  topSorted: Node[][],
  findTop: number | null,
  findTopOrdered: boolean
) => {
  if (findTop === null) {
    // Full sort
    topSorted = await handleFullSort(nodes, topSorted);
  } else if (findTopOrdered) {
    // Find top N, ordered
    topSorted = await handleOrderedPartialSort(nodes, topSorted, findTop);
  } else {
    // Find top N, unordered
    topSorted = await handleUnorderedPartialSort(nodes, topSorted, findTop);
  }

  if (findTop === null) {
    return { ans: formatList(topSorted), nodes, topSorted };
  } else {
    return {
      ans: formatList(topSorted).filter((v, i) => i < findTop),
      nodes,
      topSorted,
    };
  }
};

const cardRank = async (values, findTop = null, findTopOrdered = true) => {
  let nodes = values.map((val) => new Node(val));

  await pairRankNodes(nodes, indexMap);

  let topSorted = topSort(nodes);

  return cardRankHelper(nodes, topSorted, indexMap, findTop, findTopOrdered);
};

const run = async () => {
  const { values } = yaml.load(fs.readFileSync("./values.yaml"));

  const res1 = await cardRank(
    values.filter((v, i) => i < 10),
    3,
    false
  );
  console.log(res1.ans);
  console.log(`Comps: ${comparisons}`);

  comparisons = 0;

  const { nodes, topSorted, indexMap } = res1;
  const res2 = await cardRankHelper(nodes, topSorted, indexMap, 3, true);

  console.log(res2.ans);
};

run();

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

/**
 * Build the site in typescript
 */
