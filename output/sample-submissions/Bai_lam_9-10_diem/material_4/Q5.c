#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) { puts("Invalid input"); return 0; }
    double *bmi = malloc((size_t)n * sizeof(*bmi));
    if (!bmi) return 1;
    /* Validate the entire dataset before printing classifications. */
    for (int i = 0; i < n; i++) {
        double weight, height;
        if (scanf("%lf %lf", &weight, &height) != 2 || !isfinite(weight) || !isfinite(height) || weight <= 0 || height <= 0 || height > 3.0) {
            puts("Invalid input"); free(bmi); return 0;
        }
        bmi[i] = weight / (height * height);
    }
    for (int i = 0; i < n; i++) {
        if (bmi[i] < 18.5) puts("Underweight");
        else if (bmi[i] < 25.0) puts("Normal");
        else if (bmi[i] < 30.0) puts("Overweight");
        else puts("Obese");
    }
    free(bmi);
    return 0;
}
