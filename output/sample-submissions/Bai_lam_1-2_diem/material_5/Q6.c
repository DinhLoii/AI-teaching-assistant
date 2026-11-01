#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    int n;
    char name[1024];
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) if (scanf("%1023s", name) != 1) return 1;
    /* Palindrome checks and the count are not implemented. */
    return 0;
}
