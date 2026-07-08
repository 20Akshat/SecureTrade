package DSA;

public class SingleElementSortedArray {
    public int singleNonDuplicate(int[] nums) {
        int low = 0;
        int high = nums.length - 1;

        // Boundary cases (Edge cases)
        // 1. Agar array me sirf 1 hi element hai
        if (nums.length == 1) {
            return nums[0];
        }
        // 2. Agar pehla element hi single hai
        if (nums[0] != nums[1]) {
            return nums[0];
        }
        // 3. Agar aakhiri element hi single hai
        if (nums[high] != nums[high - 1]) {
            return nums[high];
        }

        // Binary Search Loop
        while (low <= high) {
            int mid = low + (high - low) / 2;

            // 1. Check karo: kya 'mid' hi hamara single element hai?
            // (Agar mid apne left aur right dono elements se alag hai, toh wahi answer hai)
            if (nums[mid] != nums[mid - 1] && nums[mid] != nums[mid + 1]) {
                return nums[mid];
            }

            // 2. Left Half (Single element se pehle ka pattern) check karo:
            // Pattern rule: Pehla element Even index par, dusra element Odd index par.
            if ((mid % 2 == 0 && nums[mid] == nums[mid + 1]) || 
                (mid % 2 == 1 && nums[mid] == nums[mid - 1])) {
                // Agar pattern match ho gaya, matlab single element aage (right side) hai
                low = mid + 1;
            } else {
                // Agar pattern match nahi hua, matlab single element peeche (left side) hai
                high = mid - 1;
            }
        }

        return -1;
    }
}
