import java.util.*;

// Definition of TreeNode at the bottom of the file
public class DistanceK {

    // Main solver function (LeetCode style)
    public List<Integer> distanceK(TreeNode root, TreeNode target, int k) {
        List<Integer> result = new ArrayList<>();
        if (root == null) return result;

        // Step 1: Child to Parent pointers mapping create karo (DFS)
        Map<TreeNode, TreeNode> parentMap = new HashMap<>();
        buildParentMap(root, null, parentMap);

        // Step 2: BFS run karne ke liye Queue & Visited Set initiate karo
        Queue<TreeNode> queue = new LinkedList<>();
        Set<TreeNode> visited = new HashSet<>();

        // Starting point -> target node
        queue.offer(target);
        visited.add(target);

        int currentLevel = 0;

        // BFS loop
        while (!queue.isEmpty()) {
            // Agar hum target se k distance tak pahunch gaye, toh queue me jo elements hain wahi humara result hain
            if (currentLevel == k) {
                while (!queue.isEmpty()) {
                    result.add(queue.poll().val);
                }
                return result;
            }

            // Processing elements of the current level
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                TreeNode curr = queue.poll();

                // Direction 1: Left Child (agar exists aur visited na ho)
                if (curr.left != null && !visited.contains(curr.left)) {
                    queue.offer(curr.left);
                    visited.add(curr.left);
                }

                // Direction 2: Right Child (agar exists aur visited na ho)
                if (curr.right != null && !visited.contains(curr.right)) {
                    queue.offer(curr.right);
                    visited.add(curr.right);
                }

                // Direction 3: Parent Node (agar exists aur visited na ho)
                TreeNode parentNode = parentMap.get(curr);
                if (parentNode != null && !visited.contains(parentNode)) {
                    queue.offer(parentNode);
                    visited.add(parentNode);
                }
            }
            // Ek level traverse karne ke baad, step distance badha do
            currentLevel++;
        }

        return result;
    }

    // Helper DFS Function: Pure tree me traverse karke parent links map me add karna
    private void buildParentMap(TreeNode curr, TreeNode parent, Map<TreeNode, TreeNode> parentMap) {
        if (curr == null) return;

        // Agar parent hai, toh key (curr) to value (parent) map karo
        if (parent != null) {
            parentMap.put(curr, parent);
        }

        // Recursion left aur right subtrees me check karo (Jahan parent 'curr' node ban jayega)
        buildParentMap(curr.left, curr, parentMap);
        buildParentMap(curr.right, curr, parentMap);
    }

    // ============================================================
    // 🧪 DRY-RUN & VERIFICATION (Automatic Runner)
    // ============================================================
    public static void main(String[] args) {
        System.out.println("----------------------------------------");
        System.out.println("🧪 Running Tests for LeetCode #863 (Distance K)...");
        System.out.println("----------------------------------------");

        // Building the exact example tree:
        //          3
        //         / \
        //        5   1
        //       / \ / \
        //      6  2 0  8
        //        / \
        //       7   4
        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(5);
        root.right = new TreeNode(1);
        root.left.left = new TreeNode(6);
        root.left.right = new TreeNode(2);
        root.left.right.left = new TreeNode(7);
        root.left.right.right = new TreeNode(4);
        root.right.left = new TreeNode(0);
        root.right.right = new TreeNode(8);

        // Target is Node 5
        TreeNode target = root.left;
        int k = 2;

        DistanceK solver = new DistanceK();
        List<Integer> ans = solver.distanceK(root, target, k);

        System.out.println("Target Node value: " + target.val);
        System.out.println("Distance K: " + k);
        System.out.println("Returned Nodes at distance K: " + ans);

        // Verification
        boolean passed = ans.contains(7) && ans.contains(4) && ans.contains(1) && ans.size() == 3;
        System.out.println("\n📊 Final Status: " + (passed ? "🟢 PASSED!" : "🔴 FAILED!"));
        System.out.println("----------------------------------------");
    }
}

// Tree node structure definition
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int x) { val = x; }
}
