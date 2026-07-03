import java.util.Deque;
import java.util.ArrayDeque;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        if (n == 0 || k == 0) return new int[0];
        
        // Result array: isme total (n - k + 1) answers store honge
        int[] res = new int[n - k + 1];
        
        // Deque: hum elements ke index store karenge monotonic decreasing order me
        Deque<Integer> deque = new ArrayDeque<>();
        
        for (int i = 0; i < n; i++) {
            // Step 1: Aage se safai (Remove out-of-bounds indices)
            // Agar Deque ke front ka index window se bahar (chota) ho gaya hai, toh pop kar do
            if (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
                deque.pollFirst();
            }
            
            // Step 2: Peeche se safai (Remove smaller elements)
            // Jab tak current element 'nums[i]' Deque ke peeche wale elements se bada hai,
            // toh un peeche wale elements ko pop kar do (bully effect)
            while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {
                deque.pollLast();
            }
            
            // Step 3: Current index ko Deque ke peeche push karo
            deque.offerLast(i);
            
            // Step 4: Result array me store karo
            // Hum answers tabhi store karna shuru karenge jab hamari pehli window complete ho jaye (i >= k - 1)
            // Window ka maximum humesha Deque ke front me hoga
            if (i >= k - 1) {
                res[i - k + 1] = nums[deque.peekFirst()];
            }
        }
        
        return res;
    }
}
