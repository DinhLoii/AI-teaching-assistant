#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n;
    double weight, height;
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) if (scanf("%lf %lf", &weight, &height) != 2) return 1;
    /* Validation and BMI classification are not implemented. */
    return 0;
}
