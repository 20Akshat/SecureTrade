import java.util.*;

/**
 * 🧠 Problem 1: Two Sum (LeetCode #1)
 * 
 * Goal: nums array me se do values dhoondho jinka sum 'target' ke barabar ho, aur unke indices return karo.
 * 
 * Constraints:
 * 1. Har input ke liye exactly ek solution hoga.
 * 2. Same element ko do baar use nahi kar sakte.
 * 3. Array unsorted ho sakti hai.
 * 
 * Run command: java TwoSum.java
 */
public class TwoSum {

    // 1. O(N^2) Brute Force Solution
    public static int[] twoSumBruteForce(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[]{i, j};
                }
            }
        }
        return new int[]{}; // Return empty array if not found
    }

    // 2. O(N) Hash Map Solution (Optimized)
    public static int[] twoSumOptimized(int[] nums, int target) {
        // Hint: Use HashMap in Java
        // HashMap methods:
        // Map<Integer, Integer> map = new HashMap<>(); // key: element, value: index
        // check key existence: map.containsKey(complement)
        // get index: map.get(complement)
        // add key-value: map.put(value, index)
        
        // WRITE YOUR OPTIMIZED CODE HERE
        
        return new int[]{}; // Replace this placeholder
    }

    // ==========================================
    // 🧪 AUTOMATED TESTS RUNNER (Do not modify)
    // ==========================================
    static class TestCase {
        int[] nums;
        int target;
        int[] expected;

        TestCase(int[] nums, int target, int[] expected) {
            this.nums = nums;
            this.target = target;
            this.expected = expected;
        }
    }

    public static void main(String[] args) {
        System.out.println("----------------------------------------");
        System.out.println("🧪 Running Tests for Two Sum (Java)...");
        System.out.println("----------------------------------------");

        List<TestCase> testCases = new ArrayList<>();
        testCases.add(new TestCase(new int[]{2, 7, 11, 15}, 9, new int[]{0, 1}));
        testCases.add(new TestCase(new int[]{3, 2, 4}, 6, new int[]{1, 2}));
        testCases.add(new TestCase(new int[]{3, 3}, 6, new int[]{0, 1}));
        testCases.add(new TestCase(new int[]{1, 5, 8, 12, 3}, 11, new int[]{2, 4}));

        boolean bruteForcePassed = true;
        boolean optimizedPassed = true;

        for (int i = 0; i < testCases.size(); i++) {
            TestCase tc = testCases.get(i);
            
            // Test Brute Force
            int[] resBrute = twoSumBruteForce(tc.nums, tc.target);
            int[] sortedResBrute = resBrute.clone();
            Arrays.sort(sortedResBrute);
            
            int[] sortedExpected = tc.expected.clone();
            Arrays.sort(sortedExpected);
            boolean bruteOk = Arrays.equals(sortedResBrute, sortedExpected);

            if (bruteOk) {
                System.out.println("✅ Case " + (i + 1) + " (Brute Force): Passed!");
            } else {
                System.out.println("❌ Case " + (i + 1) + " (Brute Force): Failed! Expected " + Arrays.toString(tc.expected) + ", got " + Arrays.toString(resBrute));
                bruteForcePassed = false;
            }

            // Test Optimized
            int[] resOpt = twoSumOptimized(tc.nums, tc.target);
            int[] sortedResOpt = resOpt.clone();
            Arrays.sort(sortedResOpt);
            
            boolean optOk = Arrays.equals(sortedResOpt, sortedExpected);

            if (optOk) {
                System.out.println("✅ Case " + (i + 1) + " (Optimized): Passed!");
            } else {
                System.out.println("❌ Case " + (i + 1) + " (Optimized): Failed! Expected " + Arrays.toString(tc.expected) + ", got " + Arrays.toString(resOpt));
                optimizedPassed = false;
            }
            System.out.println("-----------------------");
        }

        System.out.println("\n📊 Final Status:");
        System.out.println("Brute Force Solution: " + (bruteForcePassed ? "🟢 ALL PASSED" : "🔴 SOME FAILED"));
        System.out.println("Optimized Solution:   " + (optimizedPassed ? "🟢 ALL PASSED" : "🔴 SOME FAILED (Write your code to pass!)"));
        System.out.println("----------------------------------------");
    }
}
