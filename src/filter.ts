import * as V from './validator'

const MAX_LIMIT = 256

export function newFilter<T extends 'event' | 'transfer'>(
    ctx: Context,
    kind: T
): Connex.Thor.Filter<T> {

    const filterBody = {
        range: {
            unit: 'block',
            from: 0,
            to: 2 ** 32 - 1
        },
        options: {
            offset: 0,
            limit: 10
        },
        criteriaSet: [] as Array<Connex.Thor.Event.Criteria | Connex.Thor.Transfer.Criteria>,
        order: 'asc'
    }

    return {
        criteria(set) {
            if (kind === 'event') {
                V.validate(set as Connex.Thor.Event.Criteria[], [eventCriteriaScheme], 'arg0')
                filterBody.criteriaSet = (set as Connex.Thor.Event.Criteria[])
                    .map(c => {
                        return {
                            address: c.address ? c.address.toLowerCase() : undefined,
                            topic0: c.topic0 ? c.topic0.toLowerCase() : undefined,
                            topic1: c.topic1 ? c.topic1.toLowerCase() : undefined,
                            topic2: c.topic2 ? c.topic2.toLowerCase() : undefined,
                            topic3: c.topic3 ? c.topic3.toLowerCase() : undefined,
                            topic4: c.topic4 ? c.topic4.toLowerCase() : undefined
                        }
                    })
            } else {
                V.validate(set as Connex.Thor.Transfer.Criteria[], [transferCriteriaScheme], 'arg0')
                filterBody.criteriaSet = (set as Connex.Thor.Transfer.Criteria[])
                    .map(c => {
                        return {
                            txOrigin: c.txOrigin ? c.txOrigin.toLowerCase() : undefined,
                            sender: c.sender ? c.sender.toLowerCase() : undefined,
                            recipient: c.recipient ? c.recipient.toLowerCase() : undefined
                        }
                    })

            }
            return this
        },
        range(range) {
            V.validate(range, {
                unit: v => (v === 'block' || v === 'time') ? '' : `expected 'block' or 'time'`,
                from: 'uint64',
                to: 'uint64'
            }, 'arg0')
            V.ensure(range.from >= range.to, 'arg0.from expected >= arg0.to')

            filterBody.range = { ...range }
            return this
        },
        order(order) {
            V.ensure(order === 'asc' || order === 'desc',
                `arg0 expected 'asc' or 'desc'`)
            filterBody.order = order
            return this
        },
        apply(offset, limit) {
            V.validate(offset, 'uint64', 'arg0')
            V.ensure(limit >= 0 && limit <= MAX_LIMIT && Number.isInteger(limit),
                `arg1 expected unsigned integer <= ${MAX_LIMIT}`)

            filterBody.options.offset = offset
            filterBody.options.limit = limit

            if (kind === 'transfer') {
                return ctx.driver.filterTransferLogs(filterBody as any) as Promise<any>
            } else {
                return ctx.driver.filterEventLogs(filterBody as any) as Promise<any>
            }
        }
    }
}

const eventCriteriaScheme: V.Scheme<Connex.Thor.Event.Criteria> = {
    address: new V.Optional('address'),
    topic0: new V.Optional('bytes32'),
    topic1: new V.Optional('bytes32'),
    topic2: new V.Optional('bytes32'),
    topic3: new V.Optional('bytes32'),
    topic4: new V.Optional('bytes32')
}
const transferCriteriaScheme: V.Scheme<Connex.Thor.Transfer.Criteria> = {
    sender: new V.Optional('address'),
    recipient: new V.Optional('address'),
    txOrigin: new V.Optional('address')
}
