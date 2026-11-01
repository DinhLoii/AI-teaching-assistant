#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    double width, height;
    if (scanf("%lf %lf", &width, &height) != 2 || width <= 0 || height <= 0) return 1;
    printf("%.2f\n", hypot(width, height));
    return 0;
}
