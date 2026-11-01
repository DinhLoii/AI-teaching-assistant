#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

int main(void) {
    /* Sum digits as text so large positive integers do not overflow. */
    int ch, sum = 0;
    do { ch = getchar(); } while (ch != EOF && isspace((unsigned char)ch));
    if (ch == '+') ch = getchar();
    while (ch != EOF && isdigit((unsigned char)ch)) {
        sum += ch - '0';
        ch = getchar();
    }
    printf("%d\n", sum);
    return 0;
}
