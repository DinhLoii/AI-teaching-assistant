#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    /* Incomplete attempt: only extracts the last digit. */
    printf("%d\n", n % 10);
    return 0;
}
