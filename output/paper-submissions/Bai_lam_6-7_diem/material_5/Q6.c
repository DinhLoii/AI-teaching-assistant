#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
char *word(void) {
    size_t n=0,cap=32;
    char *s=malloc(cap); int c;
    if(!s) return NULL;
    do {c=getchar();} while(c!=EOF && isspace((unsigned char)c));
    while(c!=EOF && !isspace((unsigned char)c)) {
        if(n+1>=cap) {cap*=2;char *t=realloc(s,cap);if(!t){free(s);return NULL;}s=t;}
        s[n++]=(char)c; c=getchar();
    }
    s[n]='\0';return s;
}
int main(void) {
    int n,best=-1;char *winner=NULL;
    if(scanf("%d",&n)!=1 || n<=0) return 0;
    for(int i=0;i<n;i++) {
        char *s=word();int count=0;
        if(!s) {free(winner);return 1;}
        for(size_t j=0;s[j];j++) if(strchr("aeiouAEIOU",s[j])) count++;
        printf("%s: %d vowel(s)\n",s,count);
        if(count>best) {free(winner);winner=s;best=count;} else free(s);
    }
    printf("Most vowels: %s\n",winner);free(winner);
    return 0;
}
