import java.util.Stack;

class SolutionII {
    public int[] nextGreaterElements(int[] nums) {
        Stack<Integer> st = new Stack<>();
        int n = nums.length;
        int[] res = new int[n];
        
        for (int i = 2 * n - 1; i >= 0; i--) {
            int curr = nums[i % n];
            
            // 1. POP: Chote aur barabar elements ko stack se nikal do
            while (!st.isEmpty() && curr >= st.peek()) {
                st.pop();
            }
            
            // 2. STORE: Pehle answer save karo (agar hum actual array limits me hain)
            if (i < n) {
                res[i] = st.isEmpty() ? -1 : st.peek();
            }
            
            // 3. PUSH: Current element ko stack me push karo
            st.push(curr);
        }
        
        return res;
    }
}
