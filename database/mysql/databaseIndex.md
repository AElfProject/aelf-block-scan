# database index from HyperyPay

```mysql
alter table transactions_unconfirmed add index params_to(params_to);
alter table transactions_unconfirmed add index method(method);
alter table transactions_unconfirmed add index address_to(address_to);
alter table transactions_unconfirmed add index address_from(address_from);

alter table transactions_0 add index params_to(params_to);
alter table transactions_0 add index method(method);
alter table transactions_0 add index address_to(address_to);
alter table transactions_0 add index address_from(address_from);
```

```mysql
alter table transactions_unconfirmed add index block_height(block_height);
alter table transactions_0 add index block_height(block_height);
```

```mysql
alter table blocks_unconfirmed add index block_height(block_height);
alter table blocks_unconfirmed add index block_hash(block_hash);

alter table blocks_0 add index block_height(block_height);
alter table blocks_0 add index block_hash(block_hash);
```
