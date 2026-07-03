import java.util.*;

/**
 * 🧠 Problem 2: Maximum Subarray / Kadane's Algorithm (LeetCode #53)
 * 
 * Goal: Array 'nums' me se contiguous subarray dhoondho jiska sum maximum ho, aur uska max sum return karo.
 * 
 * Constraints:
 * 1. Array size >= 1
 * 2. Elements positive aur negative dono ho sakte hain.
 * 
 * Run command: java MaxSubarray.java
 */
public class MaxSubarray {

    // 1. O(N^2) Brute Force Solution
    public static int maxSubarrayBruteForce(int[] nums) {
        int maxSum = Integer.MIN_VALUE;
        for (int i = 0; i < nums.length; i++) {
            int currentSum = 0;
            for (int j = i; j < nums.length; j++) {
                currentSum += nums[j];
                if (currentSum > maxSum) {
                    maxSum = currentSum;
                }
            }
        }
        return maxSum;
    }

    // 2. O(N) Kadane's Algorithm (Optimized)
    public static int maxSubarrayOptimized(int[] nums) {
        // Hint: Start currentSum = nums[0] and maxSum = nums[0]
        // Loop through array from index 1.
        // Formula: 
        // currentSum = Math.max(num, currentSum + num); (Naya start ya continuation)
        // maxSum = Math.max(maxSum, currentSum);
        
        // WRITE YOUR KADANE'S CODE HERE
        
        return 0; // Replace this placeholder
    }

    // ==========================================
    // 🧪 AUTOMATED TESTS RUNNER (Do not modify)
    // ==========================================
    static class TestCase {
        int[] nums;
        int expected;

        TestCase(int[] nums, int expected) {
            this.nums = nums;
            this.expected = expected;
        }
    }

    public static void main(String[] args) {
        System.out.println("----------------------------------------");
        System.out.println("🧪 Running Tests for Maximum Subarray (Java)...");
        System.out.println("----------------------------------------");

        List<TestCase> testCases = new ArrayList<>();
        testCases.add(new TestCase(new int[]{-2, 1, -3, 4, -1, 2, 1, -5, 4}, 6)); // Subarray: [4, -1, 2, 1]
        testCases.add(new TestCase(new int[]{1}, 1));
        testCases.add(new TestCase(new int[]{5, 4, -1, 7, 8}, 23));
        testCases.add(new TestCase(new int[]{-1, -2, -3, -4}, -1));

        boolean bruteForcePassed = true;
        boolean optimizedPassed = true;

        for (int i = 0; i < testCases.size(); i++) {
            TestCase tc = testCases.get(i);
            
            // Test Brute Force
            int resBrute = maxSubarrayBruteForce(tc.nums);
            boolean bruteOk = (resBrute == tc.expected);
            
            if (bruteOk) {
                System.out.println("✅ Case " + (i + 1) + " (Brute Force): Passed!");
            } else {
                System.out.println("❌ Case " + (i + 1) + " (Brute Force): Failed! Expected " + tc.expected + ", got " + resBrute);
                bruteForcePassed = false;
            }

            // Test Optimized
            int resOpt = maxSubarrayOptimized(tc.nums);
            boolean optOk = (resOpt == tc.expected);

            if (optOk) {
                System.out.println("✅ Case " + (i + 1) + " (Optimized): Passed!");
            } else {
                System.out.println("❌ Case " + (i + 1) + " (Optimized): Failed! Expected " + tc.expected + ", got " + resOpt);
                optimizedPassed = false;
            }
            System.out.println("-----------------------");
        }

        System.out.println("\n📊 Final Status:");
        System.out.println("Brute Force Solution: " + (bruteForcePassed ? "🟢 ALL PASSED" : "🔴 SOME FAILED"));
        System.out.println("Optimized (Kadane's): " + (optimizedPassed ? "🟢 ALL PASSED" : "🔴 SOME FAILED (Write your code to pass!)"));
        System.out.println("----------------------------------------");
    }
}
