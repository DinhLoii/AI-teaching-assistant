#include <stdio.h>
int main(void) {
    int n,a,b,first,second,fi,si;
    if(scanf("%d",&n)!=1 || n<2) return 0;
    if(scanf("%d%d",&a,&b)!=2) return 0;
    if(a>b) {first=a;fi=0;second=b;si=1;}
    else {first=b;fi=1;second=a;si=0;}
    for(int i=2;i<n;i++) {
        int x; if(scanf("%d",&x)!=1) return 0;
        if(x>first) {second=first;si=fi;first=x;fi=i;}
        else if(x>second) {second=x;si=i;}
    }
    printf("Second largest = %d, index = %d\n",second,si);
    return 0;
}
