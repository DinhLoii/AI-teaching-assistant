#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n, target, found = 0;
    if (scanf("%d %d", &n, &target) != 2 || n <= 1) return 1;
    int *values = malloc((size_t)n * sizeof(*values));
    if (!values) return 1;
    for (int i = 0; i < n; i++) if (scanf("%d", &values[i]) != 1) { free(values); return 1; }
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if ((long long)values[i] + values[j] == target) {
                printf("(%d, %d)\n", values[i], values[j]);
                found = 1;
            }
        }
    }
    if (!found) puts("No pair found");
    free(values);
    return 0;
}
