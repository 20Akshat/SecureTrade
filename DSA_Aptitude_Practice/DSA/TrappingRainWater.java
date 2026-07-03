class Solution {
    public int trap(int[] height) {
        int n = height.length;
        if (n == 0) return 0;
        
        // 1. Create leftMax and rightMax arrays
        int[] leftMax = new int[n];
        int[] rightMax = new int[n];
        
        // TODO: Step 2 - Fill leftMax array from Left to Right
        // Hint: leftMax[i] represents the maximum height from 0 to i
        
        
        // TODO: Step 3 - Fill rightMax array from Right to Left
        // Hint: rightMax[i] represents the maximum height from i to n-1
        
        
        // TODO: Step 4 - Calculate total water trapped
        // Loop through the array and use: 
        // totalWater += Math.min(leftMax[i], rightMax[i]) - height[i]
        int totalWater = 0;
        
        
        return totalWater;
    }
}
