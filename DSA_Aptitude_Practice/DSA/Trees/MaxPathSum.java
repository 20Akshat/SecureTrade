import java.util.*;

// Definition of TreeNode (Pre-defined for LeetCode)
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}

public class MaxPathSum {

    int maxSum = Integer.MIN_VALUE;

    public int maxPathSum(TreeNode root) {
        // WRITE YOUR CODE HERE
        // Tip: Reset maxSum = Integer.MIN_VALUE, call helper function and return maxSum.
        
        return 0; // Placeholder
    }

    // Helper recursive function (e.g. findMaxPathDown)
    // WRITE YOUR HELPER FUNCTION HERE

    // ============================================================
    // 🧪 DRY-RUN & AUTOMATED TESTS (Do not modify)
    // ============================================================
    public static void main(String[] args) {
        System.out.println("----------------------------------------");
        System.out.println("🧪 Running Tests for LeetCode #124 (Max Path Sum)...");
        System.out.println("----------------------------------------");

        MaxPathSum solver = new MaxPathSum();

        // Test Case 1: Simple tree
        //      1
        //     / \
        //    2   3
        // Expected: 6 (Path: 2 -> 1 -> 3)
        TreeNode root1 = new TreeNode(1);
        root1.left = new TreeNode(2);
        root1.right = new TreeNode(3);

        int res1 = solver.maxPathSum(root1);
        System.out.println("Test Case 1: " + (res1 == 6 ? "🟢 PASSED" : "🔴 FAILED (Expected 6, got " + res1 + ")"));

        // Test Case 2: Tree with negative values
        //      -10
        //      /  \
        //     9    20
        //         /  \
        //        15   7
        // Expected: 42 (Path: 15 -> 20 -> 7)
        TreeNode root2 = new TreeNode(-10);
        root2.left = new TreeNode(9);
        root2.right = new TreeNode(20);
        root2.right.left = new TreeNode(15);
        root2.right.right = new TreeNode(7);

        int res2 = solver.maxPathSum(root2);
        System.out.println("Test Case 2: " + (res2 == 42 ? "🟢 PASSED" : "🔴 FAILED (Expected 42, got " + res2 + ")"));
        System.out.println("----------------------------------------");
    }
}
