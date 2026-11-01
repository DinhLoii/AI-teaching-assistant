#include <stdio.h>
#include <stdlib.h>
int desc(const void *a,const void *b) {
    int x=*(const int*)a,y=*(const int*)b;
    return (x<y)-(x>y);
}
int main(void) {
    int n,k=0,x;
    if(scanf("%d",&n)!=1 || n<=0) return 0;
    int *a=malloc((size_t)n*sizeof(int));
    if(!a) return 1;
    for(int i=0;i<n;i++) {
        if(scanf("%d",&x)!=1) {free(a);return 0;}
        if(x%2==0) a[k++]=x;
    }
    qsort(a,k,sizeof(int),desc);
    if(!k) printf("No even numbers among the %d elements",n);
    for(int i=0;i<k;i++) printf("%s%d",i?" ":"",a[i]);
    putchar('\n'); free(a);
    return 0;
}
