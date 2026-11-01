#include <stdio.h>
int main(void) {
    double r;
    if (scanf("%lf", &r) != 1) return 0;
    const double pi = 3.14159265;
    printf("%.2f\n%.2f\n", 2*pi*r, pi*r*r);
    return 0;
}
