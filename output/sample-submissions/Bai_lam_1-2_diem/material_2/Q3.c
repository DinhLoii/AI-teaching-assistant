#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n, value;
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) if (scanf("%d", &value) != 1) return 1;
    /* Selection and sorting are not implemented. */
    return 0;
}
