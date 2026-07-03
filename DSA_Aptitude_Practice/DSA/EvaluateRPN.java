import java.util.Stack;

class Solution {
    public int evalRPN(String[] tokens) {
        Stack<Integer> stack = new Stack<>();
        
        for (String token : tokens) {
            // TODO: Step 1 - Check if token is an operator (+, -, *, /)
            // If it is an operator:
            //   1. Pop the top two elements from stack:
            //      int b = stack.pop(); // second operand
            //      int a = stack.pop(); // first operand
            //   2. Apply the operator (a + b, a - b, a * b, or a / b)
            //   3. Push the result back to the stack
            
            
            // TODO: Step 2 - If it is a number, parse it and push to stack
            // Hint: use 'Integer.parseInt(token)' to convert String to int
            
        }
        
        // At the end, the stack will have exactly one element, which is the final answer
        return stack.pop();
    }
}
