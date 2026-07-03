import java.util.Stack;

class Solution {
    public String decodeString(String s) {
        Stack<Integer> numStack = new Stack<>();
        Stack<StringBuilder> strStack = new Stack<>();
        
        StringBuilder currentString = new StringBuilder();
        int currentNum = 0;
        
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) {
                // TODO: Step 1 - Build the multiplier number
                // (Hint: numbers can be multiple digits like "12[ab]")
                
            } else if (c == '[') {
                // TODO: Step 2 - Entering a bracket
                // Push currentNum to numStack and currentString to strStack.
                // Then reset currentNum to 0 and currentString to a new StringBuilder.
                
            } else if (c == ']') {
                // TODO: Step 3 - Exiting a bracket
                // Pop count from numStack. Pop outerString from strStack.
                // Repeat currentString 'count' times, append it to outerString.
                // Then set currentString = outerString.
                
            } else {
                // TODO: Step 4 - It is a letter, append it to currentString
                
            }
        }
        
        return currentString.toString();
    }
}
