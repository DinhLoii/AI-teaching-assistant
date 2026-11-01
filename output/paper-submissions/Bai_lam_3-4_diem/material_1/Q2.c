#include <stdio.h>
int main(void) {
    int a,b,found=0;
    if(scanf("%d%d",&a,&b)!=2) return 0;
    for(int x=a;x<=b;x++) {
        int prime=x>=2;
        for(int d=2;d<=x/d && prime;d++) if(x%d==0) prime=0;
        if(prime) { printf("%s%d",found?" ":"",x); found=1; }
    }
    if(!found) printf("No prime found in [%d, %d]",a,b);
    putchar('\n');
    return 0;
}
