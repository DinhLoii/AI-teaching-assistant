#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n, target, value;
    if (scanf("%d %d", &n, &target) != 2) return 1;
    for (int i = 0; i < n; i++) if (scanf("%d", &value) != 1) return 1;
    /* Pair search is not implemented. */
    return 0;
}
