#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

static int is_palindrome(const char *name) {
    size_t length = strlen(name);
    for (size_t i = 0; i < length / 2; i++) {
        if (tolower((unsigned char)name[i]) != tolower((unsigned char)name[length - 1 - i])) return 0;
    }
    return 1;
}
int main(void) {
    int n, count = 0;
    if (scanf("%d", &n) != 1 || n <= 0) return 1;
    for (int i = 0; i < n; i++) {
        char name[1024];
        if (scanf("%1023s", name) != 1) return 1;
        if (is_palindrome(name)) { puts(name); count++; }
    }
    if (!count) puts("No palindrome found");
    printf("Total palindromes: %d\n", count);
    return 0;
}
