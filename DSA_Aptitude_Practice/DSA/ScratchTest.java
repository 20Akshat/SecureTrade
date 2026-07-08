package DSA;

public class ScratchTest {
    public static void main(String[] args) {
        int n = 12;
        int[] primes = {2, 7, 13, 19};
        
        long[] a = new long[n];
        a[0] = 1;
        for (int i = 1; i < n; i++) {
            a[i] = Integer.MAX_VALUE;
        }
        
        long[] b = new long[n];
        b[0] = 1;
        
        for (int i = 0; i < primes.length; i++) {
            int indexA = 1;
            int indexB = 0;
            for (int j = 1; j < n; j++) {
                if (b[indexB] * primes[i] < a[indexA]) {
                    b[j] = b[indexB] * primes[i];
                    indexB++;
                } else {
                    b[j] = a[indexA];
                    indexA++;
                }
            }
            long[] temp = a;
            a = b;
            b = temp;
        }

        System.out.println("Result: " + a[n - 1]);
        System.out.print("Full array: ");
        for (long val : a) {
            System.out.print(val + " ");
        }
        System.out.println();
    }
}
