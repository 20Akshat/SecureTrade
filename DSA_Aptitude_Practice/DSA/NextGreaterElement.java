import java.util.HashMap;
import java.util.Map;
import java.util.Stack;

class Solution {
    public int[] nextGreaterElement(int[] nums1, int[] nums2) {
        // 1. Stack: Monotonic decreasing order me elements ko store karne ke liye
        Stack<Integer> stack = new Stack<>();
        
        // 2. HashMap: nums2 ke elements aur unke next greater mapping ko save karne ke liye
        Map<Integer, Integer> map = new HashMap<>();
        
        // 3. Loop: nums2 par piche se aage (right to left) traverse karenge
        for (int i = nums2.length - 1; i >= 0; i--) {
            int curr = nums2[i];
            
            // POP: Jab tak stack khali nahi hai aur top element current element se chota hai, use pop karo
            while (!stack.isEmpty() && stack.peek() <= curr) {
                stack.pop();
            }
            
            // STORE: Agar stack khali ho gaya toh koi bada element nahi hai (-1). Else, top element hi answer hai.
            int nextGreater = stack.isEmpty() ? -1 : stack.peek();
            map.put(curr, nextGreater);
            
            // PUSH: Current element ko stack me daalo
            stack.push(curr);
        }
        
        // 4. Result: nums1 ke elements ke answers Map se fetch karke output array me daalo
        int[] res = new int[nums1.length];
        for (int i = 0; i < nums1.length; i++) {
            res[i] = map.get(nums1[i]);
        }
        
        return res;
    }
}
