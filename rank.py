import string
import random


def print_node_set(s):
    return list(map(lambda x: x.val, list(s)))


class Node:
    def __init__(self, val):
        self.val = val
        self.o = set()
        self.i = set()

    def __repr__(self):
        return f'Node(val={self.val}, out={print_node_set(self.o)}, in={print_node_set(self.i)})'


compare_count = 0
# returns if NodeA beats NodeB
def compare(nodeA, nodeB, index_map):
    global compare_count
    compare_count += 1
    print(f'comparison: {nodeA.val} vs {nodeB.val}')
    return index_map[nodeA.val] < index_map[nodeB.val]


def top_sort(nodes):
    # Then do topological sort
    # Start by making a copy of the in and out lists
    for node in nodes:
        # i3/o3 are modified. i2/o2 copy i3/o3 at the end of each iteration
        node.i3 = node.i.copy()
        node.o3 = node.o.copy()
    # Then work through nodes until there are no more 'in's.
    # Do this in groups
    top_sorted = []  # list of lists
    top_sorted_set = set()
    while len(top_sorted_set) < len(nodes):
        for node in nodes:
            node.i2 = node.i3.copy()
            node.o2 = node.o3.copy()
        top_sorted.append([])
        for node in nodes:
            if node in top_sorted_set:
                continue
            if len(node.i2) == 0:
                top_sorted[-1].append(node)
                top_sorted_set.add(node)
                for out in list(node.o3):
                    out.i3.remove(node)

    for node in nodes:
        node.i2 = node.i3 = node.o2 = node.o3 = None

    return top_sorted


def format_list(top_sorted):
    return list(map(lambda x: ",".join(map(lambda y: y.val, x)), top_sorted))


def cardrank(actual_order, find_top=None):
    index_map = {v: i for (i, v) in enumerate(actual_order)}

    nodes = [Node(val) for val in actual_order]

    # Start by pairing up random nodes.
    # This is more efficient than doing the topsort approach from the start.
    random.shuffle(nodes)
    for i in range(0, len(nodes), 2):
        if i+1 >= len(nodes):
            break
        first = nodes[i]
        second = nodes[i+1]
        if compare(first, second, index_map):
            first.o.add(second)
            second.i.add(first)
        else:
            first.i.add(second)
            second.o.add(first)

    top_sorted = top_sort(nodes)

    # Now, find a pair with the same ranking, and break the tie. Then re-run top sort
    has_sorted_top_n = False
    while (find_top is None and len(top_sorted) < len(nodes)) or (find_top is not None and not has_sorted_top_n):
        if find_top is None:
            random.shuffle(top_sorted)
        for rank in top_sorted:
            if len(rank) < 2:
                continue
            first, second = rank[0], rank[1]
            if compare(first, second, index_map):
                first.o.add(second)
                second.i.add(first)
            else:
                first.i.add(second)
                second.o.add(first)
            break
        print(format_list(top_sorted))
        top_sorted = top_sort(nodes)
        has_sorted_top_n = all(map(lambda x: len(x) == 1, top_sorted[:find_top]))

    print('done')
    global compare_count
    print('comparisons:', compare_count)

    if find_top is None:
        return format_list(top_sorted)
    else:
        return format_list(top_sorted)[:find_top]


if __name__ == '__main__':
    realvals = list(str(x) for x in range(4))
    print(realvals)
    res = cardrank(realvals)
    print(res)
