class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int low = 1;
        int high = Integer.MIN_VALUE;
        for (int pile : piles) {
            if (pile > high) {
                high = pile;
            }
        }
        
        int ans = high;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            
            if (canEat(piles, mid, h)) {
                ans = mid;
                high = mid - 1; // Slower speed try karo
            } else {
                low = mid + 1; // Speed badhani padegi
            }
        }
        return ans;
    }
    
    private boolean canEat(int[] piles, int speed, int h) {
        long totalHours = 0;
        for (int pile : piles) {
            totalHours += (pile + speed - 1) / speed; // Ceil division formula
        }
        return totalHours <= h;
    }
}
