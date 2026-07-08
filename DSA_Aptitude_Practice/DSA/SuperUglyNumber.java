package DSA;

public class SuperUglyNumber {
    public int nthSuperUglyNumber(int n, int[] primes) {
        // 1. Array to store computed super ugly numbers
        int[] ugly = new int[n];
        ugly[0] = 1; // By definition, 1st number is 1

        // 2. Pointers array to track which index of 'ugly' each prime is currently multiplying
        int[] pointers = new int[primes.length];

        // 3. Loop to compute each super ugly number from index 1 to n-1
        for (int i = 1; i < n; i++) {
            long nextUgly = Long.MAX_VALUE; // Used 'long' to prevent integer overflow

            // Find the minimum next product among all primes
            for (int j = 0; j < primes.length; j++) {
                long currentProduct = (long) ugly[pointers[j]] * primes[j];
                nextUgly = Math.min(nextUgly, currentProduct);
            }

            // Save the minimum product to the current index
            ugly[i] = (int) nextUgly;

            // Increment pointers for all primes that produced this minimum value
            // (Handling duplicates by checking all primes)
            for (int j = 0; j < primes.length; j++) {
                long currentProduct = (long) ugly[pointers[j]] * primes[j];
                if (currentProduct == nextUgly) {
                    pointers[j]++;
                }
            }
        }

        // Return the n-th super ugly number
        return ugly[n - 1];
    }
}
