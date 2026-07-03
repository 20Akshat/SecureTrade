class Solution {
    public void nextPermutation(int[] nums) {
        int n = nums.length;
        if (n <= 1) return;
        
        // Step 1: Find the first decreasing element from the right (Breakpoint)
        int i = n - 2;
        while (i >= 0 && nums[i] >= nums[i + 1]) {
            i--;
        }
        
        // If breakpoint is found:
        if (i >= 0) {
            // TODO: Step 2 - Find the next larger element than nums[i] to its right
            // Scan from right to left to find the first element nums[j] > nums[i]
            // Then swap nums[i] and nums[j]
            
        }
        
        // TODO: Step 3 - Reverse the elements to the right of index 'i' (from i + 1 to n - 1)
        // Hint: If no breakpoint was found (i < 0), this step will reverse the entire array 
        // (which correctly handles cases like [3,2,1] -> [1,2,3])
        
    }
    
    // Helper function to swap elements
    private void swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
    
    // Helper function to reverse sub-array from start to end
    private void reverse(int[] nums, int start, int end) {
        while (start < end) {
            swap(nums, start, end);
            start++;
            end--;
        }
    }
}
