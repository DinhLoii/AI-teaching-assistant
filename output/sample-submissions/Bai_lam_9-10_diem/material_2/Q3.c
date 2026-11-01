#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

static int descending(const void *left, const void *right) {
    int a = *(const int *)left, b = *(const int *)right;
    return (a < b) - (a > b);
}
int main(void) {
    int n, count = 0;
    if (scanf("%d", &n) != 1 || n <= 0) return 1;
    int *evens = malloc((size_t)n * sizeof(*evens));
    if (!evens) return 1;
    for (int i = 0; i < n; i++) {
        int value;
        if (scanf("%d", &value) != 1) { free(evens); return 1; }
        if (value % 2 == 0) evens[count++] = value;
    }
    qsort(evens, (size_t)count, sizeof(*evens), descending);
    if (!count) printf("No even numbers among the %d elements\n", n);
    else {
        for (int i = 0; i < count; i++) printf("%s%d", i ? " " : "", evens[i]);
        putchar('\n');
    }
    free(evens);
    return 0;
}
