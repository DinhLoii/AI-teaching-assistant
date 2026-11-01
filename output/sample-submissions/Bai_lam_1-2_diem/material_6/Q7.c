#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n, a, b, c, option;
    char id[256], name[256];
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) if (scanf("%255s %255s %d %d %d", id, name, &a, &b, &c) != 5) return 1;
    if (scanf("%d", &option) != 1) return 1;
    /* Ranking and average filtering are not implemented. */
    return 0;
}
